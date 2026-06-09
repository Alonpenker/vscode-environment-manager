from pathlib import Path
from configs.app_settings import settings
from schemas.environment import WorkspaceInfo
from schemas.errors import (
    WorkspaceValidationError,
    WORKSPACE_NOT_FOUND,
    WORKSPACE_NOT_A_DIRECTORY,
    WORKSPACE_PATH_TRAVERSAL,
)


class WorkspaceService:
    workspace_root: str = settings.workspace_root
    container_path: str = "/home/workspace"

    @staticmethod
    def resolve_and_validate(mount_folder: str) -> WorkspaceInfo:
        root = Path(WorkspaceService.workspace_root).resolve()
        candidate = (root / mount_folder).resolve()

        try:
            candidate.relative_to(root)
        except ValueError:
            raise WorkspaceValidationError(
                f"Path traversal detected: {mount_folder}",
                WORKSPACE_PATH_TRAVERSAL,
            )

        if not candidate.exists():
            raise WorkspaceValidationError(
                f"Path does not exist: {mount_folder}",
                WORKSPACE_NOT_FOUND,
            )

        if not candidate.is_dir():
            raise WorkspaceValidationError(
                f"Path is not a directory: {mount_folder}",
                WORKSPACE_NOT_A_DIRECTORY,
            )

        return WorkspaceInfo(
            requested_path=mount_folder,
            resolved_host_path=str(candidate),
            container_path=WorkspaceService.container_path,
        )
