from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from configs.app_settings import AppSettings
from configs.logging import get_logger, log, LogAction
from exceptions.exception_handler import handle_exceptions
from services.docker_service import DockerService
from routes import health_router, environments_router
from schemas.errors import AppError

logger = get_logger("API")


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

app.add_exception_handler(AppError, handle_exceptions)
app.add_exception_handler(RequestValidationError, handle_exceptions)
app.add_exception_handler(Exception, handle_exceptions)

api_router = APIRouter(prefix=AppSettings.API_PREFIX)
api_router.include_router(health_router)
api_router.include_router(environments_router)
app.include_router(api_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    log(logger, "info", LogAction.REQUEST_RECEIVED, {
        "method": request.method,
        "path": str(request.url.path),
    })
    return await call_next(request)
