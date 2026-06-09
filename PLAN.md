# Plan: VS Code Web Environment Manager

---

## Step 1: Interfaces & Contracts

### 1.1 Module Map

```
manager/app/
├── main.py                         # FastAPI app factory, router registration, startup hooks
├── routes/
│   ├── health.py                   # GET /api/health
│   └── environments.py             # All /api/environments/* routes
├── schemas/
│   ├── environment.py              # CreateEnvironmentRequest, EnvironmentStatus, Environment,
│   │                               #   WorkspaceInfo, ContainerInfo, NetworkInfo, OperationResponse
│   ├── health.py                   # HealthResponse
│   └── errors.py                   # AppError subclasses, error_code literals
├── services/
│   ├── ids_service.py              # @staticmethod: compute_environment_id(resolved_path) -> str
│   ├── workspace_service.py        # @staticmethod: path validation, resolution, workspace info
│   ├── docker_service.py           # @staticmethod: Docker SDK operations (uses class variables)
│   └── environment_service.py      # @staticmethod: orchestration (uses class variables)
└── configs/
    ├── app_settings.py             # Settings (Pydantic BaseSettings, loads from .env), instantiated as `settings`
    └── logging.py                  # Logger factory, LogAction constants, structured formatter
```

---

### 1.2 `services/ids_service.py`

```python
def compute_environment_id(resolved_path: str) -> str:
    """SHA-256 hash of the resolved absolute path, first 8 hex chars."""
    ...  # returns e.g. "a3f2c1b0"
```

---

### 1.3 `configs/app_settings.py`

```python
class Settings(BaseSettings):
    # From .env
    base_public_url: str = "http://localhost"
    workspace_root: str = "./workspaces"
    managed_network_name: str = "vscode-manager-net"

    # Hardcoded in this file (configurable by editing)
    vscode_image: str = "gitpod/openvscode-server:latest"
    vscode_container_port: int = 3000
    container_name_prefix: str = "vscode-env-"
    env_label_prefix: str = "com.vscode-manager"
    max_environments: int = 10
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Instantiate settings at module level
settings = Settings()
```

---

### 1.4 `configs/logging.py`

```python
class LogAction:
    REQUEST_RECEIVED            = "request_received"
    WORKSPACE_VALIDATION_STARTED = "workspace_validation_started"
    WORKSPACE_VALIDATION_RESULT  = "workspace_validation_result"
    ENVIRONMENT_CREATE_STARTED   = "environment_create_started"
    CONTAINER_CREATED            = "container_created"
    CONTAINER_STARTED            = "container_started"
    ENVIRONMENT_STOPPED          = "environment_stopped"
    ENVIRONMENT_REMOVED          = "environment_removed"
    DOCKER_OPERATION_FAILED      = "docker_operation_failed"
    INVALID_INPUT_REJECTED       = "invalid_input_rejected"
    HEALTH_CHECK_RESULT          = "health_check_result"

def get_logger(name: str = "API") -> logging.Logger: ...

def log(logger, level: str, action: str, context: dict) -> None:
    """Emit one structured log line in format:
    2026-06-09T10:23:45.123Z | API | INFO | environment_create_started | {"environment_id": "abc12345"}
    """
```

---

### 1.5 `schemas/environment.py`

```python
class EnvironmentStatus:
    RUNNING  = "running"
    STOPPED  = "stopped"
    CREATING = "creating"
    ERROR    = "error"

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
    status: Literal[EnvironmentStatus.RUNNING, EnvironmentStatus.STOPPED, 
                    EnvironmentStatus.CREATING, EnvironmentStatus.ERROR]
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
```

---

### 1.6 `schemas/health.py`

```python
class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    docker_available: bool
    nginx_available: bool
    api_available: bool
    timestamp: datetime
```

---

### 1.7 `schemas/errors.py`

```python
class AppError(Exception):
    def __init__(self, message: str, error_code: str, http_status: int): ...

class WorkspaceValidationError(AppError): ...   # http_status=400
class EnvironmentNotFoundError(AppError): ...   # http_status=404
class EnvironmentConflictError(AppError): ...   # http_status=409
class EnvironmentLimitError(AppError): ...      # http_status=409
class DockerOperationError(AppError): ...       # http_status=500

# Error code literals
WORKSPACE_NOT_FOUND = "WORKSPACE_NOT_FOUND"
WORKSPACE_NOT_A_DIRECTORY = "WORKSPACE_NOT_A_DIRECTORY"
WORKSPACE_PATH_TRAVERSAL = "WORKSPACE_PATH_TRAVERSAL"
ENVIRONMENT_NOT_FOUND = "ENVIRONMENT_NOT_FOUND"
ENVIRONMENT_ALREADY_RUNNING = "ENVIRONMENT_ALREADY_RUNNING"
ENVIRONMENT_ALREADY_STOPPED = "ENVIRONMENT_ALREADY_STOPPED"
ENVIRONMENT_LIMIT_REACHED = "ENVIRONMENT_LIMIT_REACHED"
DOCKER_OPERATION_FAILED = "DOCKER_OPERATION_FAILED"
```

---

### 1.8 `services/workspace_service.py`

```python
from configs.app_settings import settings

class WorkspaceService:
    workspace_root: str = settings.workspace_root
    container_path: str = "/home/workspace"

    @staticmethod
    def resolve_and_validate(mount_folder: str) -> WorkspaceInfo:
        """
        Resolves mount_folder relative to WorkspaceService.workspace_root.
        Raises WorkspaceValidationError on:
          - path does not exist
          - path is not a directory
          - resolved path is outside workspace_root (traversal)
        Returns WorkspaceInfo with requested_path, resolved_host_path, container_path.
        """
```

---

### 1.9 `services/docker_service.py`

All methods raise `DockerOperationError` on Docker SDK failures.

```python
from configs.app_settings import settings
import docker

class DockerService:
    client: docker.DockerClient = docker.from_env()
    vscode_image: str = settings.vscode_image
    vscode_container_port: int = settings.vscode_container_port
    managed_network_name: str = settings.managed_network_name
    container_name_prefix: str = settings.container_name_prefix
    env_label_prefix: str = settings.env_label_prefix

    @staticmethod
    def ensure_network() -> None:
        """Create managed network (DockerService.managed_network_name) if it doesn't exist."""

    @staticmethod
    def get_container_by_id(env_id: str) -> docker.models.containers.Container | None:
        """Look up container by name vscode-env-{env_id}. Returns None if not found."""

    @staticmethod
    def list_managed_containers() -> list[docker.models.containers.Container]:
        """Return all containers with managed label."""

    @staticmethod
    def create_container(
        env_id: str,
        workspace_info: WorkspaceInfo,
    ) -> docker.models.containers.Container:
        """
        Create (but do not start) a VS Code Web container with:
          - name: vscode-env-{env_id}
          - image: DockerService.vscode_image
          - bind mount: workspace_info.resolved_host_path -> /home/workspace (rw)
          - network: DockerService.managed_network_name
          - labels: managed labels
          - command: --base-path /env/{env_id}/
        """

    @staticmethod
    def start_container(container: docker.models.containers.Container) -> None: ...

    @staticmethod
    def stop_container(container: docker.models.containers.Container) -> None: ...

    @staticmethod
    def remove_container(container: docker.models.containers.Container) -> None:
        """Stop if running, then remove."""

    @staticmethod
    def inspect_container(container: docker.models.containers.Container) -> tuple[ContainerInfo, NetworkInfo]:
        """Build ContainerInfo and NetworkInfo from container inspection data."""

    @staticmethod
    def normalize_status(container: docker.models.containers.Container) -> str:
        """Map Docker status string to EnvironmentStatus literal."""

    @staticmethod
    def check_docker_available() -> bool: ...

    @staticmethod
    def check_network_available() -> bool: ...

    @staticmethod
    def get_container_logs(env_id: str, tail: int = 100) -> str: ...
```

---

### 1.10 `services/environment_service.py`

```python
from configs.app_settings import settings

class EnvironmentService:
    base_public_url: str = settings.base_public_url
    workspace_root: str = settings.workspace_root
    max_environments: int = settings.max_environments

    @staticmethod
    def create_or_reuse(request: CreateEnvironmentRequest) -> OperationResponse:
        """
        Full create flow:
          1. Validate workspace → WorkspaceInfo (uses WorkspaceService.workspace_root)
          2. Compute env_id
          3. Check EnvironmentService.max_environments limit (only when creating new)
          4. get_container_by_id(env_id)
             - if running: return existing environment
             - if stopped: start it, return environment
             - if not found: create + start
          5. Build and return OperationResponse
        """

    @staticmethod
    def list_environments() -> list[Environment]: ...

    @staticmethod
    def get_environment(env_id: str) -> Environment:
        """Raises EnvironmentNotFoundError if not found."""

    @staticmethod
    def start_environment(env_id: str) -> OperationResponse:
        """Raises EnvironmentNotFoundError or EnvironmentConflictError(ALREADY_RUNNING)."""

    @staticmethod
    def stop_environment(env_id: str) -> OperationResponse:
        """Raises EnvironmentNotFoundError or EnvironmentConflictError(ALREADY_STOPPED)."""

    @staticmethod
    def remove_environment(env_id: str) -> OperationResponse:
        """Raises EnvironmentNotFoundError."""

    @staticmethod
    def get_logs(env_id: str) -> str:
        """Raises EnvironmentNotFoundError."""

    @staticmethod
    def cleanup() -> OperationResponse:
        """Remove all environments with status stopped or error."""

    @staticmethod
    def _build_environment(
        env_id: str,
        container: docker.models.containers.Container,
        workspace_info: WorkspaceInfo,
    ) -> Environment:
        """Compose full Environment object from container inspection."""
```

---

### 1.11 API Routes

#### `routes/health.py`

```
GET /api/health
  → 200 HealthResponse
```

#### `routes/environments.py`

```
POST /api/environments
  Body: CreateEnvironmentRequest
  → 200 OperationResponse (environment included)
  → 400 OperationResponse (workspace invalid)
  → 409 OperationResponse (limit reached)
  → 500 OperationResponse (docker failure)

GET /api/environments
  → 200 list[Environment]

GET /api/environments/{environment_id}
  → 200 Environment
  → 404 OperationResponse

POST /api/environments/{environment_id}/start
  → 200 OperationResponse
  → 404 OperationResponse
  → 409 OperationResponse (already running)
  → 500 OperationResponse

POST /api/environments/{environment_id}/stop
  → 200 OperationResponse
  → 404 OperationResponse
  → 409 OperationResponse (already stopped)
  → 500 OperationResponse

DELETE /api/environments/{environment_id}
  → 200 OperationResponse
  → 404 OperationResponse
  → 500 OperationResponse

GET /api/environments/{environment_id}/logs
  → 200 {"logs": "string"}
  → 404 OperationResponse

POST /api/environments/cleanup
  → 200 OperationResponse
```

---

### 1.12 Nginx Routing

Static config resolves VS Code Web containers by Docker DNS name.

```nginx
# API traffic
location /api/ {
    proxy_pass http://manager:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# VS Code Web traffic — routed by container name via Docker DNS
location ~ ^/env/(?<env_id>[a-z0-9]+)/ {
    proxy_pass http://vscode-env-$env_id:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

---

### 1.13 Docker Compose

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["8080:80"]
    volumes: [./nginx/nginx.conf:/etc/nginx/nginx.conf:ro]
    networks: [vscode-manager-net]
    depends_on: [manager]

  manager:
    build: ./manager
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${WORKSPACE_ROOT:-./workspaces}:/workspaces
    env_file: .env
    networks: [vscode-manager-net]
    expose: ["8000"]

networks:
  vscode-manager-net:
    name: ${MANAGED_NETWORK_NAME:-vscode-manager-net}
    driver: bridge
```

Dynamic VS Code Web containers are created by the manager and attached to the same network at runtime.

---

### 1.14 `main.py`

```python
from fastapi import FastAPI
from configs.app_settings import settings
from services.docker_service import DockerService
from routes import health_router, environments_router

app = FastAPI(title="VS Code Environment Manager")

# Include routers
app.include_router(health_router)
app.include_router(environments_router)

# Register exception handlers for AppError subclasses → structured OperationResponse
# Register middleware for request_received log

@app.on_event("startup")
async def startup():
    """Initialize Docker service and ensure managed network exists."""
    DockerService.ensure_network()
```

**Key design note:** All service class variables are initialized at module import time from `settings` (instantiated in `app_settings.py`). No runtime configuration needed beyond the startup hook that ensures the Docker network exists.

---

## Step 2: Testable Units

Ordered by dependency (foundational → orchestration).

| # | Unit | Input → Output | External Dep? |
|---|------|----------------|---------------|
| 0 | **Environment setup** | Python env, uv, dependencies, git init | Bash |
| 1 | `compute_environment_id` | `resolved_path: str` → `str (8 chars)` | No |
| 2 | `workspace_service.resolve_and_validate` — happy path | valid path under root → `WorkspaceInfo` | No (filesystem) |
| 3 | `workspace_service.resolve_and_validate` — not found | missing path → `WorkspaceValidationError` | No |
| 4 | `workspace_service.resolve_and_validate` — not a dir | file path → `WorkspaceValidationError` | No |
| 5 | `workspace_service.resolve_and_validate` — traversal | `../../etc` → `WorkspaceValidationError` | No |
| 6 | `docker_service.normalize_status` | Docker status strings → `EnvironmentStatus` literals | No |
| 7 | `docker_service.inspect_container` | mocked container object → `(ContainerInfo, NetworkInfo)` | Mock Docker SDK |
| 8 | `docker_service.get_container_by_id` | `env_id` → container or `None` | Mock Docker SDK |
| 9 | `docker_service.create_container` | `env_id`, `WorkspaceInfo` → container | Mock Docker SDK |
| 10 | `docker_service.ensure_network` | network exists / doesn't exist → idempotent | Mock Docker SDK |
| 11 | `environment_service.create_or_reuse` — new env | valid request → `OperationResponse(success=True)` | Mock DockerService |
| 12 | `environment_service.create_or_reuse` — reuse running | existing running container → returns existing | Mock DockerService |
| 13 | `environment_service.create_or_reuse` — reuse stopped | existing stopped container → starts it | Mock DockerService |
| 14 | `environment_service.stop_environment` — already stopped | stopped container → `EnvironmentConflictError` | Mock DockerService |
| 15 | `environment_service.start_environment` — already running | running container → `EnvironmentConflictError` | Mock DockerService |
| 16 | `environment_service.get_environment` — not found | unknown env_id → `EnvironmentNotFoundError` | Mock DockerService |
| 17 | Exception handler — `AppError` → HTTP response | `WorkspaceValidationError` → 400 `OperationResponse` | No |

---

## Step 3: Use Case Checklist

### Happy Path (Verifiable by Me)

- [ ] Environment setup: Python 3.12, uv, dependencies installed, git repo initialized
- [ ] `docker compose up` completes with no errors; Nginx listens on port 8080
- [ ] `GET /api/health` returns `{"status": "ok", "docker_available": true, "nginx_available": true, "api_available": true}`
- [ ] `POST /api/environments {"mount_folder": "demo"}` returns `200` with `environment_id` (8 hex chars), `status: "running"`, `url: "http://localhost:8080/env/{id}/"`
- [ ] `GET /api/environments` lists the created environment with correct `id`, `status`, `url`
- [ ] `GET /api/environments/{id}` returns full `container`, `workspace`, `network` sections
- [ ] `POST /api/environments/{id}/stop` returns `200`; subsequent `GET` shows `status: "stopped"`
- [ ] `POST /api/environments/{id}/start` returns `200`; subsequent `GET` shows `status: "running"`
- [ ] `DELETE /api/environments/{id}` returns `200`; environment absent from subsequent `GET /api/environments`
- [ ] `POST /api/environments {"mount_folder": "demo"}` when container already running → returns `200` with existing env, no new container created (`docker ps` shows single container)
- [ ] `GET /api/environments/{id}/logs` returns non-empty log string from VS Code Web container
- [ ] `POST /api/environments/cleanup` with one stopped env → `200`, env no longer listed
- [ ] Structured logs appear on stdout with correct format: `timestamp | service | level | action | context`

### Happy Path (User-Verified — Browser Integration)

- [ ] Open returned URL in browser (e.g. `http://localhost:8080/env/{id}/`) → VS Code Web loads with `workspaces/demo` mounted
- [ ] Create new file `test.txt` in VS Code Web → file appears at `workspaces/demo/test.txt` on host
- [ ] Edit `test.txt` content in VS Code Web → changes immediately reflect in host file
- [ ] Edit `test.txt` on host → changes immediately appear in VS Code Web editor

### Edge Cases (Verifiable by Me)

- [ ] `POST /api/environments {"mount_folder": "demo"}` when container stopped → container is restarted, `status: "running"` returned
- [ ] Two different `mount_folder` values (`demo` and `api`) produce different `environment_id` values and independent containers
- [ ] Same absolute path expressed differently (e.g. `demo` vs `./demo`) produces the same `environment_id`
- [ ] `GET /api/environments` returns empty list `[]` when no environments exist
- [ ] MAX_ENVIRONMENTS limit: create 10 envs successfully; 11th returns `409` with error

### Failure Modes (Verifiable by Me)

- [ ] `POST /api/environments {"mount_folder": "nonexistent"}` → `400` with `error_code: "WORKSPACE_NOT_FOUND"`
- [ ] `POST /api/environments {"mount_folder": "../../etc"}` → `400` with `error_code: "WORKSPACE_PATH_TRAVERSAL"`
- [ ] `POST /api/environments {"mount_folder": "demo/README.md"}` (file, not dir) → `400` with `error_code: "WORKSPACE_NOT_A_DIRECTORY"`
- [ ] `GET /api/environments/deadbeef` (unknown id) → `404` with `error_code: "ENVIRONMENT_NOT_FOUND"`
- [ ] `POST /api/environments/{id}/stop` on already-stopped env → `409` with `error_code: "ENVIRONMENT_ALREADY_STOPPED"`
- [ ] `POST /api/environments/{id}/start` on already-running env → `409` with `error_code: "ENVIRONMENT_ALREADY_RUNNING"`
- [ ] `POST /api/environments` (missing `mount_folder` field) → `422` Pydantic validation error
- [ ] Container startup failure (e.g. image not available) → `500` with `error_code: "DOCKER_OPERATION_FAILED"`
- [ ] Docker daemon unavailable → `GET /api/health` returns `status: "error"`

---

## Step 4: Implementation Order

Build in this sequence so each layer is testable before the next depends on it:

1. **Project scaffold** — directory structure, `pyproject.toml`, `Dockerfile`, `.env.example`, `.gitignore`, git init
2. **`schemas/`** — `environment.py`, `health.py`, `errors.py` (no dependencies)
3. **`services/ids_service.py`** — path hashing (no dependencies)
4. **`configs/`** — `app_settings.py`, `logging.py` (no circular dependencies)
5. **`services/workspace_service.py`** — filesystem only, fully testable with unit tests
6. **`services/docker_service.py`** — Docker SDK wrapper, testable with mocks
7. **`services/environment_service.py`** — orchestration, testable with mocked DockerService
8. **`routes/`** — thin HTTP layer calling services
9. **`main.py`** — app factory, exception handlers, startup hook
10. **`nginx/`** — static config, WebSocket headers, regex location block
11. **`docker-compose.yml`** — ties everything together
12. **Tests** — **to be implemented in separate `/test` step**
    - Unit tests for services (workspace, docker, environment, ids)
    - Route integration tests (mocked services)
    - Exception handler tests
    - **NOT included**: schema tests (validation is straightforward; ruff handles formatting)
13. **CI** — `.github/workflows/ci.yml`
14. **Docs** — `README.md`, `ARCHITECTURE.md`, `AI_USAGE.md`
