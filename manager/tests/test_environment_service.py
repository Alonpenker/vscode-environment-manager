import pytest
from unittest.mock import patch

from app.services.environment_service import EnvironmentService
from app.services.docker_service import DockerService
from app.schemas.environment import (
    CreateEnvironmentRequest,
    EnvironmentStatus,
    WorkspaceInfo,
    ContainerInfo,
    NetworkInfo,
    Environment,
)
from app.schemas.errors import (
    EnvironmentConflictError,
    EnvironmentNotFoundError,
    EnvironmentLimitError,
    ENVIRONMENT_ALREADY_RUNNING,
    ENVIRONMENT_ALREADY_STOPPED,
)

from conftest import make_mock_container


ENV_ID = "abc12345"
WORKSPACE_INFO = WorkspaceInfo(
    requested_path="demo",
    resolved_host_path="/workspaces/demo",
    container_path="/home/workspace",
)


def _make_env(status: str = "running") -> Environment:
    return Environment(
        id=ENV_ID,
        status=status,
        url=f"http://localhost/env/{ENV_ID}/",
        workspace=WORKSPACE_INFO,
        container=ContainerInfo(
            id="abcdef123456",
            name=f"vscode-env-{ENV_ID}",
            image="gitpod/openvscode-server:latest",
            labels={},
        ),
        network=NetworkInfo(
            network_name="vscode-manager-net",
            network_id="net123",
            ip_address="172.20.0.2",
            connected=True,
        ),
    )


# ---------------------------------------------------------------------------
# create_or_reuse
# ---------------------------------------------------------------------------


def test_create_or_reuse_creates_new_environment_when_none_exists():
    # Given: no existing container and room under the limit
    request = CreateEnvironmentRequest(mount_folder="demo")
    container = make_mock_container(ENV_ID, status="running")

    with (
        patch.object(DockerService, "get_container_by_id", return_value=None),
        patch.object(DockerService, "list_managed_containers", return_value=[]),
        patch.object(DockerService, "create_container", return_value=container),
        patch.object(DockerService, "start_container"),
        patch.object(DockerService, "wait_for_running"),
        patch.object(DockerService, "wait_for_http_ready"),
        patch(
            "app.services.workspace_service.WorkspaceService.resolve_and_validate",
            return_value=WORKSPACE_INFO,
        ),
        patch(
            "app.services.ids_service.IdsService.compute_environment_id",
            return_value=ENV_ID,
        ),
        patch.object(
            EnvironmentService, "_build_environment", return_value=_make_env("running")
        ),
    ):
        # When: create_or_reuse is called
        response = EnvironmentService.create_or_reuse(request)

    # Then: a successful response with a running environment is returned
    assert response.success is True
    assert response.environment_id == ENV_ID
    assert response.environment.status == EnvironmentStatus.RUNNING


def test_create_or_reuse_returns_existing_environment_when_already_running():
    # Given: an existing container is already running
    request = CreateEnvironmentRequest(mount_folder="demo")
    container = make_mock_container(ENV_ID, status="running")

    with (
        patch.object(DockerService, "get_container_by_id", return_value=container),
        patch.object(
            DockerService, "normalize_status", return_value=EnvironmentStatus.RUNNING
        ),
        patch(
            "app.services.workspace_service.WorkspaceService.resolve_and_validate",
            return_value=WORKSPACE_INFO,
        ),
        patch(
            "app.services.ids_service.IdsService.compute_environment_id",
            return_value=ENV_ID,
        ),
        patch.object(
            EnvironmentService, "_build_environment", return_value=_make_env("running")
        ),
    ):
        # When: create_or_reuse is called for the same folder
        response = EnvironmentService.create_or_reuse(request)

    # Then: the existing environment is returned without creating a new container
    assert response.success is True
    assert "already running" in response.message.lower()
    assert response.environment.status == EnvironmentStatus.RUNNING


def test_create_or_reuse_restarts_stopped_container():
    # Given: an existing container is stopped
    request = CreateEnvironmentRequest(mount_folder="demo")
    container = make_mock_container(ENV_ID, status="exited")

    with (
        patch.object(DockerService, "get_container_by_id", return_value=container),
        patch.object(
            DockerService, "normalize_status", return_value=EnvironmentStatus.STOPPED
        ),
        patch.object(DockerService, "start_container") as mock_start,
        patch.object(DockerService, "wait_for_running"),
        patch.object(DockerService, "wait_for_http_ready"),
        patch(
            "app.services.workspace_service.WorkspaceService.resolve_and_validate",
            return_value=WORKSPACE_INFO,
        ),
        patch(
            "app.services.ids_service.IdsService.compute_environment_id",
            return_value=ENV_ID,
        ),
        patch.object(
            EnvironmentService, "_build_environment", return_value=_make_env("running")
        ),
    ):
        # When: create_or_reuse is called
        response = EnvironmentService.create_or_reuse(request)

        # Then: the container is started and a running environment is returned
        assert response.success is True
        assert response.environment.status == EnvironmentStatus.RUNNING
        mock_start.assert_called_once_with(container)


def test_create_or_reuse_raises_limit_error_when_max_environments_reached():
    # Given: max_environments containers already exist
    request = CreateEnvironmentRequest(mount_folder="demo")
    existing = [make_mock_container(f"env{i}") for i in range(10)]

    with (
        patch.object(DockerService, "get_container_by_id", return_value=None),
        patch.object(DockerService, "list_managed_containers", return_value=existing),
        patch(
            "app.services.workspace_service.WorkspaceService.resolve_and_validate",
            return_value=WORKSPACE_INFO,
        ),
        patch(
            "app.services.ids_service.IdsService.compute_environment_id",
            return_value=ENV_ID,
        ),
        patch.object(EnvironmentService, "max_environments", 10),
    ):
        # When / Then: creating one more raises EnvironmentLimitError
        with pytest.raises(EnvironmentLimitError):
            EnvironmentService.create_or_reuse(request)


# ---------------------------------------------------------------------------
# stop_environment
# ---------------------------------------------------------------------------


def test_stop_environment_raises_conflict_when_already_stopped():
    # Given: the container status is already stopped
    container = make_mock_container(ENV_ID, status="exited")

    with (
        patch.object(DockerService, "get_container_by_id", return_value=container),
        patch.object(
            DockerService, "normalize_status", return_value=EnvironmentStatus.STOPPED
        ),
    ):
        # When / Then: stopping raises ENVIRONMENT_ALREADY_STOPPED
        with pytest.raises(EnvironmentConflictError) as exc_info:
            EnvironmentService.stop_environment(ENV_ID)

    assert exc_info.value.error_code == ENVIRONMENT_ALREADY_STOPPED


# ---------------------------------------------------------------------------
# start_environment
# ---------------------------------------------------------------------------


def test_start_environment_raises_conflict_when_already_running():
    # Given: the container status is already running
    container = make_mock_container(ENV_ID, status="running")

    with (
        patch.object(DockerService, "get_container_by_id", return_value=container),
        patch.object(
            DockerService, "normalize_status", return_value=EnvironmentStatus.RUNNING
        ),
    ):
        # When / Then: starting raises ENVIRONMENT_ALREADY_RUNNING
        with pytest.raises(EnvironmentConflictError) as exc_info:
            EnvironmentService.start_environment(ENV_ID)

    assert exc_info.value.error_code == ENVIRONMENT_ALREADY_RUNNING


# ---------------------------------------------------------------------------
# get_environment
# ---------------------------------------------------------------------------


def test_get_environment_raises_not_found_for_unknown_id():
    # Given: no container exists for the given ID
    with patch.object(DockerService, "get_container_by_id", return_value=None):
        # When / Then: lookup raises EnvironmentNotFoundError
        with pytest.raises(EnvironmentNotFoundError):
            EnvironmentService.get_environment("deadbeef")
