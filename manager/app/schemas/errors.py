WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND"
WORKSPACE_NOT_A_DIRECTORY = "WORKSPACE_NOT_A_DIRECTORY"
WORKSPACE_PATH_TRAVERSAL = "WORKSPACE_PATH_TRAVERSAL"
ENVIRONMENT_NOT_FOUND = "ENVIRONMENT_NOT_FOUND"
ENVIRONMENT_ALREADY_RUNNING = "ENVIRONMENT_ALREADY_RUNNING"
ENVIRONMENT_ALREADY_STOPPED = "ENVIRONMENT_ALREADY_STOPPED"
ENVIRONMENT_LIMIT_REACHED = "ENVIRONMENT_LIMIT_REACHED"
DOCKER_OPERATION_FAILED = "DOCKER_OPERATION_FAILED"


class AppError(Exception):
    def __init__(self, message: str, error_code: str, http_status: int):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.http_status = http_status


class WorkspaceValidationError(AppError):
    def __init__(self, message: str, error_code: str):
        super().__init__(message, error_code, 400)


class EnvironmentNotFoundError(AppError):
    def __init__(self, message: str):
        super().__init__(message, ENVIRONMENT_NOT_FOUND, 404)


class EnvironmentConflictError(AppError):
    def __init__(self, message: str, error_code: str):
        super().__init__(message, error_code, 409)


class EnvironmentLimitError(AppError):
    def __init__(self, message: str):
        super().__init__(message, ENVIRONMENT_LIMIT_REACHED, 409)


class DockerOperationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, DOCKER_OPERATION_FAILED, 500)
