from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from configs.app_settings import settings
from configs.logging import get_logger, log, LogAction
from services.docker_service import DockerService
from routes import health_router, environments_router
from schemas.errors import AppError
from schemas.environment import OperationResponse

logger = get_logger("API")

app = FastAPI(title="VS Code Environment Manager")

app.include_router(health_router)
app.include_router(environments_router)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    log(logger, "warning", LogAction.INVALID_INPUT_REJECTED, {
        "error_code": exc.error_code,
        "message": exc.message,
        "path": str(request.url),
    })
    response = OperationResponse(
        success=False,
        operation=request.method.lower(),
        message=exc.message,
        error_code=exc.error_code,
    )
    return JSONResponse(status_code=exc.http_status, content=response.model_dump())


@app.middleware("http")
async def log_requests(request: Request, call_next):
    log(logger, "info", LogAction.REQUEST_RECEIVED, {
        "method": request.method,
        "path": str(request.url.path),
    })
    return await call_next(request)


@app.on_event("startup")
async def startup():
    DockerService.ensure_network()
