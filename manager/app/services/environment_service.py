from __future__ import annotations
import docker
from configs.app_settings import settings
from schemas.environment import (
    CreateEnvironmentRequest,
    Environment,
    EnvironmentStatus,
    OperationResponse,
    WorkspaceInfo,
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


class EnvironmentService:
    base_public_url: str = settings.base_public_url
    max_environments: int = settings.max_environments

    @staticmethod
    def _build_environment(
        env_id: str,
        container: docker.models.containers.Container,
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
                container.reload()
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

        container = DockerService.create_container(env_id, workspace_info)
        DockerService.start_container(container)
        container.reload()
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
            workspace_path = labels.get(f"{DockerService.env_label_prefix}.workspace", "")
            if not env_id:
                continue
            try:
                workspace_info = WorkspaceService.resolve_and_validate(workspace_path)
            except Exception:
                workspace_info = WorkspaceInfo(
                    requested_path=workspace_path,
                    resolved_host_path="",
                    container_path="/home/workspace",
                )
            try:
                env = EnvironmentService._build_environment(env_id, container, workspace_info)
                envs.append(env)
            except Exception:
                pass
        return envs

    @staticmethod
    def get_environment(env_id: str) -> Environment:
        container = DockerService.get_container_by_id(env_id)
        if container is None:
            raise EnvironmentNotFoundError(f"Environment not found: {env_id}")
        labels = container.labels or {}
        workspace_path = labels.get(f"{DockerService.env_label_prefix}.workspace", "")
        try:
            workspace_info = WorkspaceService.resolve_and_validate(workspace_path)
        except Exception:
            workspace_info = WorkspaceInfo(
                requested_path=workspace_path,
                resolved_host_path="",
                container_path="/home/workspace",
            )
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
        container.reload()
        labels = container.labels or {}
        workspace_path = labels.get(f"{DockerService.env_label_prefix}.workspace", "")
        try:
            workspace_info = WorkspaceService.resolve_and_validate(workspace_path)
        except Exception:
            workspace_info = WorkspaceInfo(
                requested_path=workspace_path,
                resolved_host_path="",
                container_path="/home/workspace",
            )
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
        labels = container.labels or {}
        workspace_path = labels.get(f"{DockerService.env_label_prefix}.workspace", "")
        try:
            workspace_info = WorkspaceService.resolve_and_validate(workspace_path)
        except Exception:
            workspace_info = WorkspaceInfo(
                requested_path=workspace_path,
                resolved_host_path="",
                container_path="/home/workspace",
            )
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
        DockerService.remove_container(container)
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
