from typing import Literal
from pydantic import BaseModel


class EnvironmentStatus:
    RUNNING = "running"
    STOPPED = "stopped"
    CREATING = "creating"
    ERROR = "error"


class CreateEnvironmentRequest(BaseModel):
    mount_folder: str


class WorkspaceInfo(BaseModel):
    requested_path: str
    resolved_host_path: str
    container_path: str


class ContainerInfo(BaseModel):
    id: str
    name: str
    image: str
    labels: dict[str, str]


class NetworkInfo(BaseModel):
    network_name: str
    network_id: str
    ip_address: str
    connected: bool


class Environment(BaseModel):
    id: str
    status: Literal["running", "stopped", "creating", "error"]
    url: str
    workspace: WorkspaceInfo
    container: ContainerInfo
    network: NetworkInfo
    error_message: str | None = None


class OperationResponse(BaseModel):
    success: bool
    operation: str
    environment_id: str | None = None
    message: str
    environment: Environment | None = None
    error_code: str | None = None
