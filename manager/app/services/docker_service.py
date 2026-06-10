import time
import docker
import urllib.request
from docker.models.containers import Container
import docker.errors

from app.configs.app_settings import settings
from app.schemas.environment import (
    ContainerInfo,
    NetworkInfo,
    EnvironmentStatus,
    WorkspaceInfo,
)
from app.schemas.errors import DockerOperationError


class DockerService:
    client: docker.DockerClient = None
    vscode_image: str = settings.vscode_image
    vscode_container_port: int = settings.vscode_container_port
    managed_network_name: str = settings.managed_network_name
    container_name_prefix: str = settings.container_name_prefix
    env_label_prefix: str = settings.env_label_prefix

    @classmethod
    def _get_client(cls) -> docker.DockerClient:
        if cls.client is None:
            cls.client = docker.from_env()
        return cls.client

    @staticmethod
    def ensure_network() -> None:
        try:
            client = DockerService._get_client()
            existing = client.networks.list(names=[DockerService.managed_network_name])
            if not existing:
                client.networks.create(
                    DockerService.managed_network_name, driver="bridge"
                )
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to ensure network: {e}")

    @staticmethod
    def get_container_by_id(env_id: str) -> Container | None:
        try:
            name = f"{DockerService.container_name_prefix}{env_id}"
            return DockerService._get_client().containers.get(name)
        except docker.errors.NotFound:
            return None
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to get container: {e}")

    @staticmethod
    def list_managed_containers() -> list[Container]:
        try:
            label = f"{DockerService.env_label_prefix}.managed=true"
            return DockerService._get_client().containers.list(
                all=True, filters={"label": label}
            )
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to list containers: {e}")

    @staticmethod
    def create_container(
        env_id: str,
        workspace_info: WorkspaceInfo,
    ) -> Container:
        try:
            name = f"{DockerService.container_name_prefix}{env_id}"
            labels = {
                f"{DockerService.env_label_prefix}.managed": "true",
                f"{DockerService.env_label_prefix}.env_id": env_id,
                f"{DockerService.env_label_prefix}.workspace": workspace_info.requested_path,
            }
            return DockerService._get_client().containers.create(
                image=DockerService.vscode_image,
                name=name,
                command=f"--server-base-path /env/{env_id}/",
                volumes={
                    workspace_info.resolved_host_path: {
                        "bind": workspace_info.container_path,
                        "mode": "rw",
                    }
                },
                network=DockerService.managed_network_name,
                labels=labels,
                detach=True,
            )
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to create container: {e}")

    @staticmethod
    def start_container(container: Container) -> None:
        try:
            container.start()
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to start container: {e}")

    @staticmethod
    def wait_for_http_ready(container: Container, timeout: int = 60) -> None:
        container.reload()
        networks = container.attrs["NetworkSettings"]["Networks"]
        ip = networks.get(DockerService.managed_network_name, {}).get("IPAddress", "")
        if not ip:
            raise DockerOperationError("Container has no IP address on managed network")
        url = f"http://{ip}:{DockerService.vscode_container_port}/"
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                urllib.request.urlopen(url, timeout=2)
                return
            except Exception:
                time.sleep(1)
        raise DockerOperationError(
            f"VS Code did not become HTTP-ready within {timeout}s"
        )

    @staticmethod
    def wait_for_running(container: Container, timeout: int = 30) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            container.reload()
            if container.status == "running":
                return
            if container.status in ("exited", "dead", "removing"):
                exit_code = container.attrs.get("State", {}).get("ExitCode", 1)
                raise DockerOperationError(
                    f"Container exited unexpectedly with code {exit_code}"
                )
            time.sleep(1)
        raise DockerOperationError(
            f"Container did not reach running state within {timeout}s"
        )

    @staticmethod
    def stop_container(container: Container) -> None:
        try:
            container.stop()
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to stop container: {e}")

    @staticmethod
    def remove_container(container: Container) -> None:
        try:
            container.reload()
            if container.status == "running":
                container.stop()
            container.remove()
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to remove container: {e}")

    @staticmethod
    def inspect_container(container: Container) -> tuple[ContainerInfo, NetworkInfo]:
        try:
            container.reload()
            data = container.attrs

            container_info = ContainerInfo(
                id=data["Id"][:12],
                name=data["Name"].lstrip("/"),
                image=data["Config"]["Image"],
                labels=data["Config"].get("Labels", {}),
            )

            net_settings = data.get("NetworkSettings", {})
            networks = net_settings.get("Networks", {})
            net_data = networks.get(DockerService.managed_network_name, {})
            network_id = net_data.get("NetworkID", "")
            ip = net_data.get("IPAddress", "")
            connected = bool(ip)

            network_info = NetworkInfo(
                network_name=DockerService.managed_network_name,
                network_id=network_id,
                ip_address=ip,
                connected=connected,
            )

            return container_info, network_info
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to inspect container: {e}")

    @staticmethod
    def normalize_status(container: Container) -> str:
        status = container.status
        if status == "exited":
            exit_code = container.attrs.get("State", {}).get("ExitCode", 0)
            stopped_codes = {0, 137, 143}
            return (
                EnvironmentStatus.STOPPED
                if exit_code in stopped_codes
                else EnvironmentStatus.ERROR
            )
        status_map = {
            "running": EnvironmentStatus.RUNNING,
            "created": EnvironmentStatus.CREATING,
            "paused": EnvironmentStatus.RUNNING,
            "restarting": EnvironmentStatus.CREATING,
            "dead": EnvironmentStatus.ERROR,
            "removing": EnvironmentStatus.ERROR,
        }
        return status_map.get(status, EnvironmentStatus.ERROR)

    @staticmethod
    def check_docker_available() -> bool:
        try:
            DockerService._get_client().ping()
            return True
        except Exception:
            return False

    @staticmethod
    def check_network_available() -> bool:
        try:
            nets = DockerService._get_client().networks.list(
                names=[DockerService.managed_network_name]
            )
            return bool(nets)
        except Exception:
            return False

    @staticmethod
    def get_container_logs(env_id: str, tail: int = 100) -> str:
        try:
            container = DockerService.get_container_by_id(env_id)
            if container is None:
                return ""
            logs = container.logs(tail=tail)
            return (
                logs.decode("utf-8", errors="replace")
                if isinstance(logs, bytes)
                else str(logs)
            )
        except docker.errors.DockerException as e:
            raise DockerOperationError(f"Failed to get logs: {e}")
