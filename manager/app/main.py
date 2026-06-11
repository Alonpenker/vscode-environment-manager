from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI, Request

from app.configs.app_settings import AppSettings
from app.configs.logging import get_logger, log, LogAction
from app.exceptions.exception_handler import handle_exceptions
from app.services.docker_service import DockerService
from app.routes import health_router, environments_router
from app.schemas.errors import AppError

logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    DockerService.ensure_network()
    yield


app = FastAPI(
    title=AppSettings.TITLE,
    lifespan=lifespan,
    docs_url=f"{AppSettings.API_PREFIX}/docs",
    redoc_url=f"{AppSettings.API_PREFIX}/redoc",
    openapi_url=f"{AppSettings.API_PREFIX}/openapi.json",
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    log(
        logger,
        "info",
        LogAction.REQUEST_RECEIVED,
        {
            "method": request.method,
            "path": str(request.url.path),
        },
    )
    return await call_next(request)


app.add_exception_handler(AppError, handle_exceptions)
app.add_exception_handler(Exception, handle_exceptions)


api_router = APIRouter(prefix=AppSettings.API_PREFIX)
api_router.include_router(health_router)
api_router.include_router(environments_router)
app.include_router(api_router)
