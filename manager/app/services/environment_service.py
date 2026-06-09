from __future__ import annotations
import time
from docker.models.containers import Container
from configs.app_settings import settings
from configs.logging import get_logger, log, LogAction
from schemas.environment import (
    CreateEnvironmentRequest,
    Environment,
    EnvironmentStatus,
    OperationResponse,
    WorkspaceInfo,
    ContainerInfo,
    NetworkInfo,
)
from schemas.errors import (
    EnvironmentConflictError,
    EnvironmentNotFoundError,
    EnvironmentLimitError,
    ENVIRONMENT_ALREADY_RUNNING,
    ENVIRONMENT_ALREADY_STOPPED,
)
from services.ids_service import IdsService
from services.workspace_service import WorkspaceService
from services.docker_service import DockerService

logger = get_logger("API")


class EnvironmentService:
    base_public_url: str = settings.base_public_url
    max_environments: int = settings.max_environments

    @staticmethod
    def _reconstruct_workspace_info(labels: dict) -> WorkspaceInfo:
        workspace_path = labels.get(f"{DockerService.env_label_prefix}.workspace", "")
        try:
            return WorkspaceService.resolve_and_validate(workspace_path)
        except Exception:
            return WorkspaceInfo(
                requested_path=workspace_path,
                resolved_host_path="",
                container_path="/home/workspace",
            )

    @staticmethod
    def _build_environment(
        env_id: str,
        container: Container,
        workspace_info: WorkspaceInfo,
    ) -> Environment:
        container_info, network_info = DockerService.inspect_container(container)
        status = DockerService.normalize_status(container)
        url = f"{EnvironmentService.base_public_url}/env/{env_id}/"
        return Environment(
            id=env_id,
            status=status,
            url=url,
            workspace=workspace_info,
            container=container_info,
            network=network_info,
        )

    @staticmethod
    def create_or_reuse(request: CreateEnvironmentRequest) -> OperationResponse:
        workspace_info = WorkspaceService.resolve_and_validate(request.mount_folder)
        env_id = IdsService.compute_environment_id(workspace_info.resolved_host_path)

        log(logger, "info", LogAction.ENVIRONMENT_CREATE_STARTED, {
            "environment_id": env_id,
            "mount_folder": request.mount_folder,
        })

        container = DockerService.get_container_by_id(env_id)

        if container is not None:
            status = DockerService.normalize_status(container)
            if status == EnvironmentStatus.RUNNING:
                env = EnvironmentService._build_environment(env_id, container, workspace_info)
                return OperationResponse(
                    success=True,
                    operation="create_or_reuse",
                    environment_id=env_id,
                    message="Environment already running",
                    environment=env,
                )
            else:
                DockerService.start_container(container)
                DockerService.wait_for_running(container)
                log(logger, "info", LogAction.CONTAINER_STARTED, {
                    "environment_id": env_id,
                    "container_id": container.id[:12],
                })
                env = EnvironmentService._build_environment(env_id, container, workspace_info)
                return OperationResponse(
                    success=True,
                    operation="create_or_reuse",
                    environment_id=env_id,
                    message="Environment restarted",
                    environment=env,
                )

        managed = DockerService.list_managed_containers()
        if len(managed) >= EnvironmentService.max_environments:
            raise EnvironmentLimitError(
                f"Maximum number of environments ({EnvironmentService.max_environments}) reached"
            )

        start_time = time.monotonic()
        container = DockerService.create_container(env_id, workspace_info)
        log(logger, "info", LogAction.CONTAINER_CREATED, {
            "environment_id": env_id,
            "container_id": container.id[:12],
            "container_name": container.name,
        })
        DockerService.start_container(container)
        DockerService.wait_for_running(container)
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        log(logger, "info", LogAction.CONTAINER_STARTED, {
            "environment_id": env_id,
            "container_id": container.id[:12],
            "container_startup_duration_ms": elapsed_ms,
        })
        env = EnvironmentService._build_environment(env_id, container, workspace_info)
        return OperationResponse(
            success=True,
            operation="create",
            environment_id=env_id,
            message="Environment created",
            environment=env,
        )

    @staticmethod
    def list_environments() -> list[Environment]:
        containers = DockerService.list_managed_containers()
        envs = []
        for container in containers:
            labels = container.labels or {}
            env_id = labels.get(f"{DockerService.env_label_prefix}.env_id", "")
            if not env_id:
                continue
            workspace_info = EnvironmentService._reconstruct_workspace_info(labels)
            try:
                env = EnvironmentService._build_environment(env_id, container, workspace_info)
            except Exception as e:
                url = f"{EnvironmentService.base_public_url}/env/{env_id}/"
                env = Environment(
                    id=env_id,
                    status=EnvironmentStatus.ERROR,
                    url=url,
                    workspace=workspace_info,
                    container=ContainerInfo(
                        id="",
                        name=container.name,
                        image="",
                        labels=labels,
                    ),
                    network=NetworkInfo(
                        network_name="",
                        network_id="",
                        ip_address="",
                        connected=False,
                    ),
                    error_message=str(e),
                )
            envs.append(env)
        return envs

    @staticmethod
    def get_environment(env_id: str) -> Environment:
        container = DockerService.get_container_by_id(env_id)
        if container is None:
            raise EnvironmentNotFoundError(f"Environment not found: {env_id}")
        workspace_info = EnvironmentService._reconstruct_workspace_info(container.labels or {})
        return EnvironmentService._build_environment(env_id, container, workspace_info)

    @staticmethod
    def start_environment(env_id: str) -> OperationResponse:
        container = DockerService.get_container_by_id(env_id)
        if container is None:
            raise EnvironmentNotFoundError(f"Environment not found: {env_id}")
        if DockerService.normalize_status(container) == EnvironmentStatus.RUNNING:
            raise EnvironmentConflictError(
                f"Environment already running: {env_id}", ENVIRONMENT_ALREADY_RUNNING
            )
        DockerService.start_container(container)
        DockerService.wait_for_running(container)
        log(logger, "info", LogAction.CONTAINER_STARTED, {
            "environment_id": env_id,
            "container_id": container.id[:12],
        })
        workspace_info = EnvironmentService._reconstruct_workspace_info(container.labels or {})
        env = EnvironmentService._build_environment(env_id, container, workspace_info)
        return OperationResponse(
            success=True,
            operation="start",
            environment_id=env_id,
            message="Environment started",
            environment=env,
        )

    @staticmethod
    def stop_environment(env_id: str) -> OperationResponse:
        container = DockerService.get_container_by_id(env_id)
        if container is None:
            raise EnvironmentNotFoundError(f"Environment not found: {env_id}")
        if DockerService.normalize_status(container) == EnvironmentStatus.STOPPED:
            raise EnvironmentConflictError(
                f"Environment already stopped: {env_id}", ENVIRONMENT_ALREADY_STOPPED
            )
        DockerService.stop_container(container)
        container.reload()
        log(logger, "info", LogAction.ENVIRONMENT_STOPPED, {
            "environment_id": env_id,
            "container_id": container.id[:12],
        })
        workspace_info = EnvironmentService._reconstruct_workspace_info(container.labels or {})
        env = EnvironmentService._build_environment(env_id, container, workspace_info)
        return OperationResponse(
            success=True,
            operation="stop",
            environment_id=env_id,
            message="Environment stopped",
            environment=env,
        )

    @staticmethod
    def remove_environment(env_id: str) -> OperationResponse:
        container = DockerService.get_container_by_id(env_id)
        if container is None:
            raise EnvironmentNotFoundError(f"Environment not found: {env_id}")
        container_id = container.id[:12]
        DockerService.remove_container(container)
        log(logger, "info", LogAction.ENVIRONMENT_REMOVED, {
            "environment_id": env_id,
            "container_id": container_id,
        })
        return OperationResponse(
            success=True,
            operation="remove",
            environment_id=env_id,
            message="Environment removed",
        )

    @staticmethod
    def get_logs(env_id: str) -> str:
        container = DockerService.get_container_by_id(env_id)
        if container is None:
            raise EnvironmentNotFoundError(f"Environment not found: {env_id}")
        return DockerService.get_container_logs(env_id)

    @staticmethod
    def cleanup() -> OperationResponse:
        containers = DockerService.list_managed_containers()
        removed = []
        for container in containers:
            status = DockerService.normalize_status(container)
            if status in (EnvironmentStatus.STOPPED, EnvironmentStatus.ERROR):
                labels = container.labels or {}
                env_id = labels.get(f"{DockerService.env_label_prefix}.env_id", container.name)
                DockerService.remove_container(container)
                removed.append(env_id)
        return OperationResponse(
            success=True,
            operation="cleanup",
            message=f"Removed {len(removed)} environment(s): {', '.join(removed) if removed else 'none'}",
        )
