from datetime import datetime, timezone

from app.schemas.health import HealthResponse
from app.services.docker_service import DockerService


class HealthService:
    @staticmethod
    def is_ok() -> HealthResponse:
        docker_ok = DockerService.check_docker_available()
        network_ok = DockerService.check_network_available()
        return HealthResponse(
            status="ok" if (docker_ok and network_ok) else "error",
            docker_available=docker_ok,
            nginx_available=True,
            api_available=True,
            timestamp=datetime.now(timezone.utc),
        )
