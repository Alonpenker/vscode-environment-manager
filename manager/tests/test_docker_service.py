from unittest.mock import MagicMock, patch

from app.schemas.environment import WorkspaceInfo
from app.services.docker_service import DockerService


def test_create_container_uses_workspace_container_path_for_bind():
    # Given: a workspace with a known host path and container mount point
    workspace = WorkspaceInfo(
        requested_path="demo",
        resolved_host_path="/host/demo",
        container_path="/container/demo",
    )
    client = MagicMock()

    # When: a container is created for that workspace
    with patch.object(DockerService, "_get_client", return_value=client):
        DockerService.create_container("abc12345", workspace)

    # Then: the volume bind uses the workspace's container_path
    volumes = client.containers.create.call_args.kwargs["volumes"]
    assert volumes[workspace.resolved_host_path]["bind"] == workspace.container_path
