import logging
import json
from datetime import datetime, timezone


class LogAction:
    REQUEST_RECEIVED = "request_received"
    WORKSPACE_VALIDATION_STARTED = "workspace_validation_started"
    WORKSPACE_VALIDATION_RESULT = "workspace_validation_result"
    ENVIRONMENT_CREATE_STARTED = "environment_create_started"
    CONTAINER_CREATED = "container_created"
    CONTAINER_STARTED = "container_started"
    ENVIRONMENT_STOPPED = "environment_stopped"
    ENVIRONMENT_REMOVED = "environment_removed"
    DOCKER_OPERATION_FAILED = "docker_operation_failed"
    INVALID_INPUT_REJECTED = "invalid_input_rejected"
    HEALTH_CHECK_RESULT = "health_check_result"


class _StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        action = getattr(record, "action", "")
        context = getattr(record, "context", {})
        return f"{ts} | {record.name} | {record.levelname} | {action} | {json.dumps(context)}"


def get_logger(name: str = "API") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(_StructuredFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


def log(logger: logging.Logger, level: str, action: str, context: dict) -> None:
    log_method = getattr(logger, level.lower(), logger.info)
    record = logging.LogRecord(
        name=logger.name,
        level=getattr(logging, level.upper(), logging.INFO),
        pathname="",
        lineno=0,
        msg="",
        args=(),
        exc_info=None,
    )
    record.action = action
    record.context = context
    logger.handle(record)
