from pathlib import Path
from configs.app_settings import settings
from configs.logging import get_logger, log, LogAction
from schemas.environment import WorkspaceInfo
from schemas.errors import (
    WorkspaceValidationError,
    WORKSPACE_NOT_FOUND,
    WORKSPACE_NOT_A_DIRECTORY,
    WORKSPACE_PATH_TRAVERSAL,
)

logger = get_logger("API")


class WorkspaceService:
    workspace_root: str = settings.workspace_root
    workspace_container_root: str = settings.workspace_container_root
    vscode_container_path: str = "/home/workspace"

    @staticmethod
    def resolve_and_validate(mount_folder: str) -> WorkspaceInfo:
        log(logger, "info", LogAction.WORKSPACE_VALIDATION_STARTED, {"mount_folder": mount_folder})

        container_root = Path(WorkspaceService.workspace_container_root)
        candidate = (container_root / mount_folder).resolve()

        try:
            relative = candidate.relative_to(container_root)
        except ValueError:
            log(logger, "warning", LogAction.WORKSPACE_VALIDATION_RESULT, {
                "mount_folder": mount_folder,
                "result": "failure",
                "reason": "path traversal detected",
            })
            raise WorkspaceValidationError(
                f"Path traversal detected: {mount_folder}",
                WORKSPACE_PATH_TRAVERSAL,
            )

        if not candidate.exists():
            log(logger, "warning", LogAction.WORKSPACE_VALIDATION_RESULT, {
                "mount_folder": mount_folder,
                "result": "failure",
                "reason": "path does not exist",
            })
            raise WorkspaceValidationError(
                f"Path does not exist: {mount_folder}",
                WORKSPACE_NOT_FOUND,
            )

        if not candidate.is_dir():
            log(logger, "warning", LogAction.WORKSPACE_VALIDATION_RESULT, {
                "mount_folder": mount_folder,
                "result": "failure",
                "reason": "path is not a directory",
            })
            raise WorkspaceValidationError(
                f"Path is not a directory: {mount_folder}",
                WORKSPACE_NOT_A_DIRECTORY,
            )

        host_root = Path(WorkspaceService.workspace_root)
        resolved_host_path = str(host_root / relative)

        log(logger, "info", LogAction.WORKSPACE_VALIDATION_RESULT, {
            "mount_folder": mount_folder,
            "result": "success",
            "resolved_host_path": resolved_host_path,
        })

        return WorkspaceInfo(
            requested_path=mount_folder,
            resolved_host_path=resolved_host_path,
            container_path=WorkspaceService.vscode_container_path,
        )
