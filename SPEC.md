# Spec: VS Code Web Environment Manager

## Mode: New Feature

---

## Overview

A local developer platform that lets users create, access, inspect, and control browser-based VS Code coding environments backed by Docker containers. Users interact through a simple HTTP API exposed via Nginx. The system creates VS Code Web environments on demand, connects them to local workspace folders, and returns a browser URL.

---

## Functional Requirements

### Platform Bootstrap

- The system starts with a single `docker compose up` command.
- Docker Compose starts Nginx and the Python Manager API as static services.
- VS Code Web containers are created dynamically by the Manager API at runtime — they are not defined as static Compose services.
- The Manager API communicates with Docker Engine via the Docker SDK for Python (socket mount).
- A managed Docker network (`vscode-manager-net` by default) is created and used to connect Nginx, the Manager API, and all VS Code Web containers.

### Nginx Reverse Proxy

- Nginx is the only public entry point for the system (host-exposed port).
- All API traffic is routed: `Nginx /api/*` → Python Manager API.
- All VS Code browser traffic is routed: `Nginx /env/{env_id}/` → VS Code Web container on internal network.
- WebSocket proxy headers must be configured (required for browser-based VS Code).
- The Python API container is NOT directly exposed to the host as the primary user-facing port.
- VS Code Web containers are NOT directly exposed as public services.

### Python Manager API

- Built with FastAPI + Uvicorn.
- All Docker operations use the Docker SDK for Python.
- All request and response models use Pydantic schemas.
- No database. Docker container labels are the source of truth for environment discovery.
- Structured application logs emitted for all lifecycle events (see Observability section).

### API Endpoints

**Required:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check — Docker availability, network, Nginx entrypoint |
| POST | `/api/environments` | Create (or reuse) a VS Code Web environment |
| GET | `/api/environments` | List all managed environments |
| GET | `/api/environments/{environment_id}` | Inspect a specific environment |
| POST | `/api/environments/{environment_id}/start` | Start a stopped environment |
| POST | `/api/environments/{environment_id}/stop` | Stop a running environment |
| DELETE | `/api/environments/{environment_id}` | Remove an environment |

**Optional (valuable for MVP):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/environments/{environment_id}/logs` | Fetch container logs |
| POST | `/api/environments/cleanup` | Remove all stopped/errored environments |

### Create Environment Flow

1. User sends `POST /api/environments` with `mount_folder`.
2. API validates request schema (Pydantic).
3. API resolves and validates workspace path:
   - Must exist on the host.
   - Must be a directory.
   - Must be under `WORKSPACE_ROOT` (path traversal protection).
   - Rejects unsafe or missing paths with `400`.
4. API computes `environment_id` as 8-character hash of the resolved path.
5. API checks for an existing managed container with this `environment_id`.
   - If exists and running: return the existing environment.
   - If exists and stopped: restart it and return the environment.
6. API creates a VS Code Web container (if new):
   - Uses image from `VSCODE_IMAGE` config.
   - Container name: `vscode-env-{environment_id}`.
   - Mounts the resolved workspace folder as a bind mount (read-write).
   - Attaches the container to the managed Docker network.
   - Applies environment metadata as Docker labels.
7. API waits for container to reach running state.
8. Returns `OperationResponse` with `environment_id`, `status: running`, and browser `url`.

### Workspace Behavior

- The user opens the returned URL in the browser.
- VS Code Web loads the mounted workspace folder.
- File edits inside the browser are immediately reflected in the local host folder.
- The mount is read-write by default.

### Lifecycle Operations

- `start`: Starts a stopped container. Returns `404` if environment not found, `409` if already running.
- `stop`: Stops a running container. Returns `404` if not found.
- `remove`: Stops (if running) and removes the container. Environment is no longer listed after removal.
- Stopped environments remain listed with `status: stopped`.
- Removed environments are not listed.

### Predictable Lifecycle Behavior

- Repeated `POST /api/environments` with the same `mount_folder` returns or restarts the existing environment (no uncontrolled duplicates) — O(1) lookup by path hash.
- Unknown `environment_id` → `404`.
- Invalid workspace path → `400` with a clear error message.
- Docker operation failure → `500` with a structured error response.
- `POST /stop` on an already-stopped environment → `409 Conflict` (user knows service is already stopped).
- All error responses use a consistent shape (see `OperationResponse` schema).

---

## Data Schemas

### `CreateEnvironmentRequest`
```json
{
  "mount_folder": "string (required)"
}
```

### `Environment`
```json
{
  "id": "string (8-char hash of workspace path)",
  "status": "running | stopped | creating | error",
  "url": "string",
  "workspace": "WorkspaceInfo",
  "container": "ContainerInfo",
  "network": "NetworkInfo",
  "error_message": "string (optional)"
}
```

### `WorkspaceInfo`
```json
{
  "requested_path": "string",
  "resolved_host_path": "string",
  "container_path": "string"
}
```

### `ContainerInfo`
```json
{
  "id": "string",
  "name": "string",
  "image": "string",
  "labels": "object"
}
```

### `NetworkInfo`
```json
{
  "network_name": "string",
  "network_id": "string",
  "ip_address": "string",
  "connected": "boolean"
}
```

### `OperationResponse`
```json
{
  "success": "boolean",
  "operation": "string",
  "environment_id": "string (optional)",
  "message": "string",
  "environment": "Environment (optional)",
  "error_code": "string (optional)"
}
```

### `HealthResponse`
```json
{
  "status": "ok | error",
  "docker_available": "boolean",
  "nginx_available": "boolean",
  "api_available": "boolean",
  "timestamp": "datetime"
}
```

---

## Non-Functional Requirements

### Performance
- Environment creation should complete within a reasonable time once the Docker image is already pulled (target: < 5s for container start, excluding image pull).
- List and inspect endpoints should respond in < 500ms under normal load (single-user local usage).

### Security
- Nginx is the only host-exposed port (public entry point).
- API and VS Code containers communicate on the internal Docker network only.
- Workspace mount paths are validated and restricted to `WORKSPACE_ROOT`.
- Path traversal attacks (e.g., `../../etc`) must be rejected with `400`.
- Containers are labeled and isolated from unrelated Docker containers.
- Docker socket is mounted into the Manager API container. The README must explicitly warn that this grants the API full Docker Engine access and would require a socket proxy for production hardening.
- The MVP is explicitly scoped as trusted-local-use only.

### Observability (Structured Logs)

All logs follow this structure: `timestamp | service | level | action | context`

Example:
```
2026-06-09T10:23:45.123Z | API | INFO | environment_create_started | {"environment_id": "abc12345", "mount_folder": "/workspace/demo"}
```

**Log schema:**
- `timestamp`: ISO 8601 datetime
- `service`: `API` (service name)
- `level`: `DEBUG | INFO | WARNING | ERROR`
- `action`: From a fixed list (see below)
- `context`: Dict with relevant fields

**Required log actions:**

| Action | Context |
|--------|---------|
| `request_received` | `method`, `path` |
| `workspace_validation_started` | `mount_folder` |
| `workspace_validation_result` | `mount_folder`, `result` (success/failure), `reason` (if failure) |
| `environment_create_started` | `environment_id`, `mount_folder` |
| `container_created` | `environment_id`, `container_id`, `container_name` |
| `container_started` | `environment_id`, `container_id` |
| `environment_stopped` | `environment_id`, `container_id` |
| `environment_removed` | `environment_id`, `container_id` |
| `docker_operation_failed` | `operation`, `error_message` |
| `invalid_input_rejected` | `field`, `reason` |
| `health_check_result` | `docker_available`, `network_available` |

Duration logging is encouraged where practical (e.g., `container_startup_duration_ms`).

### Configuration

**Environment variables (.env, git-ignored):**

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_PUBLIC_URL` | `http://localhost` | Base URL for environment links |
| `WORKSPACE_ROOT` | `./workspaces` | Root path for allowed workspace mounts |
| `VSCODE_IMAGE` | `gitpod/openvscode-server:latest` | VS Code Web Docker image |
| `VSCODE_CONTAINER_PORT` | `3000` | Port VS Code Web listens on inside container |
| `MANAGED_NETWORK_NAME` | `vscode-manager-net` | Docker network name |
| `CONTAINER_NAME_PREFIX` | `vscode-env-` | Prefix for managed container names |
| `ENV_LABEL_PREFIX` | `com.vscode-manager` | Docker label prefix for managed environments |
| `MAX_ENVIRONMENTS` | `10` | Maximum number of managed environments |

**Hardcoded in application:**

| Setting | Value | Description |
|---------|-------|-------------|
| `LOG_LEVEL` | `INFO` | Logging verbosity |

---

## Edge Cases

- `mount_folder` refers to a file (not a directory) → `400`.
- `mount_folder` resolves outside `WORKSPACE_ROOT` → `400`.
- `mount_folder` does not exist → `400`.
- `start` called on an already-running environment → `409`.
- `stop` called on an already-stopped environment → `409` (user knows service is already stopped).
- Docker image not pulled → container creation fails with structured `500`.
- Managed network not available → health endpoint reports `degraded`.
- Container exits unexpectedly → status normalized to `error` on next inspect.
- `MAX_ENVIRONMENTS` reached → `POST /api/environments` returns `429` or `409` with a clear message.

---

## Acceptance Criteria

1. `docker compose up` starts Nginx and the Manager API with no errors.
2. `POST /api/environments` with a valid `mount_folder` returns `environment_id` (8-char hash), `status: running`, and a valid `url`.
3. Opening the returned URL in a browser loads VS Code Web with the mounted workspace.
4. Editing a file in the browser reflects the change in the local host folder.
5. `GET /api/environments` lists the created environment with correct status.
6. `GET /api/environments/{id}` returns full environment details including container, workspace, and network info.
7. `POST /api/environments/{id}/stop` stops the environment; subsequent list shows `status: stopped`.
8. `POST /api/environments/{id}/start` restarts the stopped environment; status returns to `running`.
9. `DELETE /api/environments/{id}` removes the environment; it no longer appears in the list.
10. Repeated `POST /api/environments` with the same `mount_folder` returns the existing environment (no duplicate containers — O(1) lookup by hash).
11. Invalid `mount_folder` paths return `400` with a descriptive error message.
12. Unknown `environment_id` returns `404`.
13. `POST /api/environments/{id}/stop` on already-stopped environment returns `409`.
14. `GET /api/health` returns `status: ok` when Docker and the managed network are available.
15. Structured logs are emitted for all lifecycle events with timestamp, service, level, action, and context.
16. CI pipeline passes: lint, format check, tests, docker compose config validation.

---

## Assumptions

- The system runs on a developer's local machine or internal server with Docker Engine installed.
- Only one user operates the system at a time (no multi-tenancy in MVP).
- Docker image `gitpod/openvscode-server:latest` (or equivalent) is pre-pulled or auto-pulled on first use.
- The `WORKSPACE_ROOT` directory exists on the host before the Manager API starts.
- The managed Docker network is created by Docker Compose or by the Manager API on startup if it does not exist.
- Port binding for VS Code Web containers is managed internally via the Docker network (Nginx proxies by container IP/name), not via host port mapping unless needed as a fallback.

---

## Regression Scope

This is a new project — no existing behavior to protect. However, once initial endpoints are implemented, all endpoints must continue to work as subsequent features are added (no regressions across create → list → inspect → stop → start → remove lifecycle).

---

## Open Questions — Resolved

1. **env_id strategy**: Use 8-character hash of the resolved workspace path. O(1) container lookup, no iteration needed.
2. **VS Code Web path prefix**: OK, will configure correctly via image startup flags or `--base-path`.
3. **Stop idempotency**: `409 Conflict` for already-stopped environment (user knows service is already stopped).

---

## Out of Scope (MVP)

- Web dashboard / UI
- Authentication or user ownership
- Docker socket proxy / production hardening
- CPU/memory resource limits per container
- Idle timeout cleanup (configurable but disabled by default)
- Environment templates
- Persistent database (SQLite/PostgreSQL)
- Subdomain routing or TLS
- Prometheus metrics
- Environment snapshots
- Multi-host / remote Docker / Kubernetes

---

## Project Structure

```
.
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── AI_USAGE.md
├── ARCHITECTURE.md
├── nginx/
│   ├── nginx.conf
│   └── templates/
│       └── default.conf.template
├── manager/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── health.py
│   │   │   └── environments.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── environment.py
│   │   │   ├── health.py
│   │   │   └── errors.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ids_service.py
│   │   │   ├── workspace_service.py
│   │   │   ├── docker_service.py
│   │   │   └── environment_service.py
│   │   └── configs/
│   │       ├── __init__.py
│   │       ├── settings.py
│   │       └── logging.py
│   └── tests/
│       ├── __init__.py
│       ├── test_workspace_service.py
│       ├── test_docker_service.py
│       ├── test_environment_service.py
│       ├── test_routes_health.py
│       └── test_routes_environments.py
├── workspaces/
│   └── demo/
│       └── README.md
└── .github/
    └── workflows/
        └── ci.yml
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| API framework | FastAPI |
| ASGI server | Uvicorn |
| Docker integration | Docker SDK for Python |
| Schema validation | Pydantic v2 |
| Settings | Pydantic Settings |
| Package manager | uv |
| Testing | pytest |
| Linting / formatting | ruff |
| Structured logging | Python `logging` (structlog optional) |
| Reverse proxy | Nginx |
| Runtime | Docker + Docker Compose |
| VS Code image | `gitpod/openvscode-server:latest` |
| CI | GitHub Actions |
| Python version | 3.12 |
