import pytest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from services.docker_service import DockerService
from main import app
from schemas.environment import (
    ContainerInfo,
    Environment,
    NetworkInfo,
    OperationResponse,
    WorkspaceInfo,
)


@pytest.fixture
def client():
    with patch.object(DockerService, "ensure_network"):
        with TestClient(app) as c:
            yield c


def make_mock_container(env_id: str = "abc12345", status: str = "running", workspace: str = "demo"):
    container = MagicMock()
    container.status = status
    container.name = f"vscode-env-{env_id}"
    container.labels = {
        "com.vscode-manager.managed": "true",
        "com.vscode-manager.env_id": env_id,
        "com.vscode-manager.workspace": workspace,
    }
    container.attrs = {
        "Id": f"{env_id}123456abcdef",
        "Name": f"/vscode-env-{env_id}",
        "Config": {
            "Image": "gitpod/openvscode-server:latest",
            "Labels": {
                "com.vscode-manager.managed": "true",
                "com.vscode-manager.env_id": env_id,
                "com.vscode-manager.workspace": workspace,
            },
        },
        "NetworkSettings": {
            "Networks": {
                "vscode-manager-net": {
                    "NetworkID": "net123abc456",
                    "IPAddress": "172.20.0.2",
                }
            }
        },
    }
    return container


def make_operation_response(
    env_id: str = "abc12345",
    status: str = "running",
    operation: str = "create",
    message: str = "Environment created",
) -> OperationResponse:
    env = Environment(
        id=env_id,
        status=status,
        url=f"http://localhost/env/{env_id}/",
        workspace=WorkspaceInfo(
            requested_path="demo",
            resolved_host_path="/workspaces/demo",
            container_path="/home/workspace",
        ),
        container=ContainerInfo(
            id="abcdef123456",
            name=f"vscode-env-{env_id}",
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
    return OperationResponse(
        success=True,
        operation=operation,
        environment_id=env_id,
        message=message,
        environment=env,
    )
