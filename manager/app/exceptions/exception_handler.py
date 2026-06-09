from fastapi import HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from starlette.responses import Response

from configs.logging import get_logger, log, LogAction
from schemas.errors import AppError

logger = get_logger("API")


async def handle_exceptions(request: Request, exc: Exception) -> Response:
    if isinstance(exc, RequestValidationError):
        return await request_validation_exception_handler(request, exc)
    if isinstance(exc, AppError):
        return await http_exception_handler(
            request,
            HTTPException(
                status_code=exc.http_status,
                detail={"message": exc.message, "error_code": exc.error_code},
            ),
        )
    log(logger, "error", LogAction.UNHANDLED_EXCEPTION, {"error": str(exc)})
    return await http_exception_handler(
        request,
        HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        ),
    )
