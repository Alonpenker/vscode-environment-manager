from fastapi import HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler
from starlette.responses import Response

from app.configs.logging import get_logger, log, LogAction
from app.schemas.errors import AppError

logger = get_logger()


async def _handle_app_error(request: Request, exc: AppError) -> Response:
    return await http_exception_handler(
        request,
        HTTPException(
            status_code=exc.http_status,
            detail={"message": exc.message, "error_code": exc.error_code},
        ),
    )


async def _handle_unhandled(request: Request, exc: Exception) -> Response:
    log(logger, "error", LogAction.UNHANDLED_EXCEPTION, {"error": str(exc)})
    return await http_exception_handler(
        request,
        HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        ),
    )


async def handle_exceptions(request: Request, exc: Exception) -> Response:
    if isinstance(exc, AppError):
        return await _handle_app_error(request, exc)
    return await _handle_unhandled(request, exc)
