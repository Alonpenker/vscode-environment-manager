import pytest

from app.services.workspace_service import WorkspaceService
from app.services.ids_service import IdsService
from app.schemas.errors import (
    WorkspaceValidationError,
    WORKSPACE_NOT_FOUND,
    WORKSPACE_NOT_A_DIRECTORY,
    WORKSPACE_PATH_TRAVERSAL,
)


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_resolve_and_validate_returns_workspace_info_for_valid_directory(
    tmp_path, monkeypatch
):
    # Given: a real directory under the workspace root
    monkeypatch.setattr(WorkspaceService, "workspace_root", str(tmp_path))
    monkeypatch.setattr(WorkspaceService, "workspace_container_root", str(tmp_path))
    demo = tmp_path / "demo"
    demo.mkdir()

    # When: we resolve and validate the folder
    info = WorkspaceService.resolve_and_validate("demo")

    # Then: workspace info is returned with correct paths
    assert info.requested_path == "demo"
    assert info.resolved_host_path == str(demo)
    assert info.container_path == "/home/workspace"


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


def test_resolve_and_validate_raises_not_found_for_missing_directory(
    tmp_path, monkeypatch
):
    # Given: workspace root contains no "nonexistent" directory
    monkeypatch.setattr(WorkspaceService, "workspace_root", str(tmp_path))
    monkeypatch.setattr(WorkspaceService, "workspace_container_root", str(tmp_path))

    # When / Then: validation raises WORKSPACE_NOT_FOUND
    with pytest.raises(WorkspaceValidationError) as exc_info:
        WorkspaceService.resolve_and_validate("nonexistent")

    assert exc_info.value.error_code == WORKSPACE_NOT_FOUND
    assert exc_info.value.http_status == 400


def test_resolve_and_validate_raises_not_a_directory_for_file_path(
    tmp_path, monkeypatch
):
    # Given: workspace root contains a file (not a directory)
    monkeypatch.setattr(WorkspaceService, "workspace_root", str(tmp_path))
    monkeypatch.setattr(WorkspaceService, "workspace_container_root", str(tmp_path))
    (tmp_path / "README.md").write_text("hello")

    # When / Then: validation raises WORKSPACE_NOT_A_DIRECTORY
    with pytest.raises(WorkspaceValidationError) as exc_info:
        WorkspaceService.resolve_and_validate("README.md")

    assert exc_info.value.error_code == WORKSPACE_NOT_A_DIRECTORY
    assert exc_info.value.http_status == 400


def test_resolve_and_validate_raises_path_traversal_for_parent_escape(
    tmp_path, monkeypatch
):
    # Given: workspace root is set to tmp_path
    monkeypatch.setattr(WorkspaceService, "workspace_root", str(tmp_path))
    monkeypatch.setattr(WorkspaceService, "workspace_container_root", str(tmp_path))

    # When / Then: attempting to escape via "../.." raises WORKSPACE_PATH_TRAVERSAL
    with pytest.raises(WorkspaceValidationError) as exc_info:
        WorkspaceService.resolve_and_validate("../../etc")

    assert exc_info.value.error_code == WORKSPACE_PATH_TRAVERSAL
    assert exc_info.value.http_status == 400


# ---------------------------------------------------------------------------
# Edge cases — environment ID stability
# ---------------------------------------------------------------------------


def test_different_mount_folders_produce_different_environment_ids(
    tmp_path, monkeypatch
):
    # Given: two different directories under the workspace root
    monkeypatch.setattr(WorkspaceService, "workspace_root", str(tmp_path))
    monkeypatch.setattr(WorkspaceService, "workspace_container_root", str(tmp_path))
    (tmp_path / "demo").mkdir()
    (tmp_path / "api").mkdir()

    # When: each folder is resolved and its ID computed
    id_demo = IdsService.compute_environment_id(
        WorkspaceService.resolve_and_validate("demo").resolved_host_path
    )
    id_api = IdsService.compute_environment_id(
        WorkspaceService.resolve_and_validate("api").resolved_host_path
    )

    # Then: IDs are distinct
    assert id_demo != id_api


def test_same_path_expressed_differently_produces_same_environment_id(
    tmp_path, monkeypatch
):
    # Given: one directory reachable as "demo" and as "./demo"
    monkeypatch.setattr(WorkspaceService, "workspace_root", str(tmp_path))
    monkeypatch.setattr(WorkspaceService, "workspace_container_root", str(tmp_path))
    (tmp_path / "demo").mkdir()

    # When: both expressions are resolved
    id_plain = IdsService.compute_environment_id(
        WorkspaceService.resolve_and_validate("demo").resolved_host_path
    )
    id_dotslash = IdsService.compute_environment_id(
        WorkspaceService.resolve_and_validate("./demo").resolved_host_path
    )

    # Then: the IDs are identical
    assert id_plain == id_dotslash
