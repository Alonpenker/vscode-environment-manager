from unittest.mock import MagicMock, patch

from schemas.environment import WorkspaceInfo
from services.docker_service import DockerService


def test_create_container_uses_workspace_container_path_for_bind():
    workspace = WorkspaceInfo(
        requested_path="demo",
        resolved_host_path="/host/demo",
        container_path="/container/demo",
    )
    client = MagicMock()

    with patch.object(DockerService, "_get_client", return_value=client):
        DockerService.create_container("abc12345", workspace)

    volumes = client.containers.create.call_args.kwargs["volumes"]
    assert volumes[workspace.resolved_host_path]["bind"] == workspace.container_path
