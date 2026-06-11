from fastapi import APIRouter

from app.schemas.environment import (
    CreateEnvironmentRequest,
    Environment,
    LogsResponse,
    OperationResponse,
)
from app.services.environment_service import EnvironmentService

router = APIRouter(prefix="/environments")


@router.post("", response_model=OperationResponse)
def create_environment(request: CreateEnvironmentRequest):
    return EnvironmentService.create_or_reuse(request)


@router.get("", response_model=list[Environment])
def list_environments():
    return EnvironmentService.list_environments()


@router.post("/cleanup", response_model=OperationResponse)
def cleanup():
    return EnvironmentService.cleanup()


@router.get("/{environment_id}", response_model=Environment)
def get_environment(environment_id: str):
    return EnvironmentService.get_environment(environment_id)


@router.post("/{environment_id}/start", response_model=OperationResponse)
def start_environment(environment_id: str):
    return EnvironmentService.start_environment(environment_id)


@router.post("/{environment_id}/stop", response_model=OperationResponse)
def stop_environment(environment_id: str):
    return EnvironmentService.stop_environment(environment_id)


@router.delete("/{environment_id}", response_model=OperationResponse)
def remove_environment(environment_id: str):
    return EnvironmentService.remove_environment(environment_id)


@router.get("/{environment_id}/logs", response_model=LogsResponse)
def get_logs(environment_id: str):
    return EnvironmentService.get_logs(environment_id)
