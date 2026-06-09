from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    docker_available: bool
    nginx_available: bool
    api_available: bool
    timestamp: datetime
