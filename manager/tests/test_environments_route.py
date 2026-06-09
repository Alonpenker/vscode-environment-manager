import pytest
from unittest.mock import patch, MagicMock

from services.environment_service import EnvironmentService
from schemas.environment import Environment, EnvironmentStatus
from schemas.errors import (
    WorkspaceValidationError,
    EnvironmentConflictError,
    EnvironmentNotFoundError,
    EnvironmentLimitError,
    WORKSPACE_NOT_FOUND,
    WORKSPACE_NOT_A_DIRECTORY,
    WORKSPACE_PATH_TRAVERSAL,
    ENVIRONMENT_NOT_FOUND,
    ENVIRONMENT_ALREADY_STOPPED,
    ENVIRONMENT_ALREADY_RUNNING,
)

from conftest import make_operation_response


ENV_ID = "abc12345"


# ---------------------------------------------------------------------------
# POST /api/environments — Happy path
# ---------------------------------------------------------------------------


def test_create_environment_returns_200_with_running_status_and_url(client):
    # Given: workspace is valid, no existing container
    response_data = make_operation_response(ENV_ID, status="running", operation="create")

    with patch.object(EnvironmentService, "create_or_reuse", return_value=response_data):
        # When: create request is sent
        response = client.post("/api/environments", json={"mount_folder": "demo"})

    # Then: 200 with environment_id, running status, and a URL
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["environment_id"] == ENV_ID
    assert data["environment"]["status"] == "running"
    assert f"/env/{ENV_ID}/" in data["environment"]["url"]


def test_create_environment_reuses_already_running_container(client):
    # Given: a container for the same path is already running
    response_data = make_operation_response(
        ENV_ID, status="running", operation="create_or_reuse", message="Environment already running"
    )

    with patch.object(EnvironmentService, "create_or_reuse", return_value=response_data):
        # When: create is called again for the same folder
        response = client.post("/api/environments", json={"mount_folder": "demo"})

    # Then: 200 is returned with the existing environment (no new container created)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["environment"]["status"] == "running"


def test_create_environment_restarts_stopped_container(client):
    # Given: a container for the path exists but is stopped
    response_data = make_operation_response(
        ENV_ID, status="running", operation="create_or_reuse", message="Environment restarted"
    )

    with patch.object(EnvironmentService, "create_or_reuse", return_value=response_data):
        # When: create is called for the same folder
        response = client.post("/api/environments", json={"mount_folder": "demo"})

    # Then: 200 is returned with running status (container was restarted)
    assert response.status_code == 200
    data = response.json()
    assert data["environment"]["status"] == "running"


# ---------------------------------------------------------------------------
# POST /api/environments — Failure modes
# ---------------------------------------------------------------------------


def test_create_environment_returns_400_for_nonexistent_path(client):
    # Given: the workspace folder does not exist on disk
    with patch.object(
        EnvironmentService,
        "create_or_reuse",
        side_effect=WorkspaceValidationError("not found", WORKSPACE_NOT_FOUND),
    ):
        # When: create is called with a missing folder
        response = client.post("/api/environments", json={"mount_folder": "nonexistent"})

    # Then: 400 with WORKSPACE_NOT_FOUND
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == WORKSPACE_NOT_FOUND


def test_create_environment_returns_400_for_path_traversal(client):
    # Given: the mount_folder attempts to escape the workspace root
    with patch.object(
        EnvironmentService,
        "create_or_reuse",
        side_effect=WorkspaceValidationError("traversal", WORKSPACE_PATH_TRAVERSAL),
    ):
        # When: create is called with a traversal path
        response = client.post("/api/environments", json={"mount_folder": "../../etc"})

    # Then: 400 with WORKSPACE_PATH_TRAVERSAL
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == WORKSPACE_PATH_TRAVERSAL


def test_create_environment_returns_400_for_file_instead_of_directory(client):
    # Given: the mount_folder path points to a file, not a directory
    with patch.object(
        EnvironmentService,
        "create_or_reuse",
        side_effect=WorkspaceValidationError("not a dir", WORKSPACE_NOT_A_DIRECTORY),
    ):
        # When: create is called with a file path
        response = client.post("/api/environments", json={"mount_folder": "demo/README.md"})

    # Then: 400 with WORKSPACE_NOT_A_DIRECTORY
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == WORKSPACE_NOT_A_DIRECTORY


def test_create_environment_returns_422_when_mount_folder_field_is_missing(client):
    # Given: request body omits the required mount_folder field

    # When: create is called without mount_folder
    response = client.post("/api/environments", json={})

    # Then: 422 Pydantic validation error
    assert response.status_code == 422


def test_create_environment_returns_409_when_environment_limit_is_reached(client):
    # Given: the maximum number of environments is already running
    with patch.object(
        EnvironmentService,
        "create_or_reuse",
        side_effect=EnvironmentLimitError("limit reached"),
    ):
        # When: one more environment is requested
        response = client.post("/api/environments", json={"mount_folder": "demo"})

    # Then: 409 with ENVIRONMENT_LIMIT_REACHED
    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == "ENVIRONMENT_LIMIT_REACHED"


# ---------------------------------------------------------------------------
# GET /api/environments
# ---------------------------------------------------------------------------


def test_list_environments_returns_empty_list_when_no_environments_exist(client):
    # Given: no environments have been created
    with patch.object(EnvironmentService, "list_environments", return_value=[]):
        # When: list is requested
        response = client.get("/api/environments")

    # Then: 200 with an empty list
    assert response.status_code == 200
    assert response.json() == []


def test_list_environments_includes_running_environment(client):
    # Given: one environment was created
    env = make_operation_response(ENV_ID).environment

    with patch.object(EnvironmentService, "list_environments", return_value=[env]):
        # When: list is requested
        response = client.get("/api/environments")

    # Then: 200 with a list containing the environment
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == ENV_ID
    assert data[0]["status"] == "running"


# ---------------------------------------------------------------------------
# GET /api/environments/{id}
# ---------------------------------------------------------------------------


def test_get_environment_returns_full_details_including_container_workspace_network(client):
    # Given: an existing environment
    env = make_operation_response(ENV_ID).environment

    with patch.object(EnvironmentService, "get_environment", return_value=env):
        # When: GET by ID is requested
        response = client.get(f"/api/environments/{ENV_ID}")

    # Then: 200 with full container, workspace, and network sections
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ENV_ID
    assert "container" in data
    assert "workspace" in data
    assert "network" in data


def test_get_environment_returns_404_for_unknown_id(client):
    # Given: no environment exists with the requested ID
    with patch.object(
        EnvironmentService,
        "get_environment",
        side_effect=EnvironmentNotFoundError("not found"),
    ):
        # When: GET is called with an unknown ID
        response = client.get("/api/environments/deadbeef")

    # Then: 404 with ENVIRONMENT_NOT_FOUND
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == ENVIRONMENT_NOT_FOUND


# ---------------------------------------------------------------------------
# POST /api/environments/{id}/stop
# ---------------------------------------------------------------------------


def test_stop_environment_returns_200(client):
    # Given: a running environment
    response_data = make_operation_response(ENV_ID, status="stopped", operation="stop", message="Environment stopped")

    with patch.object(EnvironmentService, "stop_environment", return_value=response_data):
        # When: stop is called
        response = client.post(f"/api/environments/{ENV_ID}/stop")

    # Then: 200 with success
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_stop_environment_returns_409_when_already_stopped(client):
    # Given: the environment is already stopped
    with patch.object(
        EnvironmentService,
        "stop_environment",
        side_effect=EnvironmentConflictError("already stopped", ENVIRONMENT_ALREADY_STOPPED),
    ):
        # When: stop is called again
        response = client.post(f"/api/environments/{ENV_ID}/stop")

    # Then: 409 with ENVIRONMENT_ALREADY_STOPPED
    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == ENVIRONMENT_ALREADY_STOPPED


# ---------------------------------------------------------------------------
# POST /api/environments/{id}/start
# ---------------------------------------------------------------------------


def test_start_environment_returns_200(client):
    # Given: a stopped environment
    response_data = make_operation_response(ENV_ID, status="running", operation="start", message="Environment started")

    with patch.object(EnvironmentService, "start_environment", return_value=response_data):
        # When: start is called
        response = client.post(f"/api/environments/{ENV_ID}/start")

    # Then: 200 with success
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_start_environment_returns_409_when_already_running(client):
    # Given: the environment is already running
    with patch.object(
        EnvironmentService,
        "start_environment",
        side_effect=EnvironmentConflictError("already running", ENVIRONMENT_ALREADY_RUNNING),
    ):
        # When: start is called again
        response = client.post(f"/api/environments/{ENV_ID}/start")

    # Then: 409 with ENVIRONMENT_ALREADY_RUNNING
    assert response.status_code == 409
    assert response.json()["detail"]["error_code"] == ENVIRONMENT_ALREADY_RUNNING


# ---------------------------------------------------------------------------
# DELETE /api/environments/{id}
# ---------------------------------------------------------------------------


def test_delete_environment_returns_200(client):
    # Given: an existing environment
    response_data = make_operation_response(ENV_ID, operation="remove", message="Environment removed")
    response_data.environment = None

    with patch.object(EnvironmentService, "remove_environment", return_value=response_data):
        # When: delete is called
        response = client.delete(f"/api/environments/{ENV_ID}")

    # Then: 200 with success
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_delete_unknown_environment_returns_404(client):
    # Given: no environment exists with the requested ID
    with patch.object(
        EnvironmentService,
        "remove_environment",
        side_effect=EnvironmentNotFoundError("not found"),
    ):
        # When: delete is called for an unknown ID
        response = client.delete("/api/environments/deadbeef")

    # Then: 404 with ENVIRONMENT_NOT_FOUND
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == ENVIRONMENT_NOT_FOUND


# ---------------------------------------------------------------------------
# GET /api/environments/{id}/logs
# ---------------------------------------------------------------------------


def test_get_logs_returns_log_string_for_running_environment(client):
    # Given: an existing environment with log output
    with patch.object(EnvironmentService, "get_logs", return_value="VS Code server started on port 3000"):
        # When: logs are requested
        response = client.get(f"/api/environments/{ENV_ID}/logs")

    # Then: 200 with a non-empty logs string
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert len(data["logs"]) > 0


def test_get_logs_returns_404_for_unknown_environment(client):
    # Given: no environment exists with the requested ID
    with patch.object(
        EnvironmentService,
        "get_logs",
        side_effect=EnvironmentNotFoundError("not found"),
    ):
        # When: logs are requested for an unknown ID
        response = client.get("/api/environments/deadbeef/logs")

    # Then: 404 with ENVIRONMENT_NOT_FOUND
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == ENVIRONMENT_NOT_FOUND


# ---------------------------------------------------------------------------
# POST /api/environments/cleanup
# ---------------------------------------------------------------------------


def test_cleanup_removes_stopped_environments_and_returns_success(client):
    # Given: one stopped environment exists
    response_data = make_operation_response(ENV_ID, operation="cleanup", message="Removed 1 environment(s): abc12345")
    response_data.environment = None

    with patch.object(EnvironmentService, "cleanup", return_value=response_data):
        # When: cleanup is triggered
        response = client.post("/api/environments/cleanup")

    # Then: 200 with success
    assert response.status_code == 200
    assert response.json()["success"] is True
