import pytest
from unittest.mock import patch

from services.docker_service import DockerService


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_health_returns_ok_when_docker_and_network_available(client):
    # Given: Docker daemon and managed network are both reachable
    with (
        patch.object(DockerService, "check_docker_available", return_value=True),
        patch.object(DockerService, "check_network_available", return_value=True),
    ):
        # When: health endpoint is requested
        response = client.get("/api/health")

    # Then: status is ok and all subsystems report available
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["docker_available"] is True
    assert data["nginx_available"] is True
    assert data["api_available"] is True


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


def test_health_returns_error_when_docker_daemon_unavailable(client):
    # Given: Docker daemon cannot be reached
    with (
        patch.object(DockerService, "check_docker_available", return_value=False),
        patch.object(DockerService, "check_network_available", return_value=False),
    ):
        # When: health endpoint is requested
        response = client.get("/api/health")

    # Then: status is error and docker_available is false
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["docker_available"] is False
