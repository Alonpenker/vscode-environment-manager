# VS Code Web Environment Manager

A local developer platform that creates browser-based VS Code environments backed by Docker containers. A single HTTP API lets you spin up, inspect, stop, and remove environments, each connected to a local workspace folder.

## Prerequisites

- Docker Engine and Docker Compose v2
- A `.env` file configured from `.env.example`

## Setup

```bash
cp .env.example .env
# Edit .env and set WORKSPACE_ROOT to the absolute path of your workspaces directory
# Example: WORKSPACE_ROOT=/home/user/project/workspaces
```

`WORKSPACE_ROOT` must be the **absolute path** on the host machine. Relative paths will not resolve correctly inside the manager container.

## Start

```bash
docker compose up --build
```

Nginx listens on `http://localhost:8080`. The manager API is not directly exposed.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/environments` | Create or reuse an environment |
| GET | `/api/environments` | List all environments |
| GET | `/api/environments/{id}` | Inspect an environment |
| POST | `/api/environments/{id}/start` | Start a stopped environment |
| POST | `/api/environments/{id}/stop` | Stop a running environment |
| DELETE | `/api/environments/{id}` | Remove an environment |
| GET | `/api/environments/{id}/logs` | Fetch container logs |
| POST | `/api/environments/cleanup` | Remove all stopped/errored environments |

### Create an environment

```bash
curl -X POST http://localhost:8080/api/environments \
  -H "Content-Type: application/json" \
  -d '{"mount_folder": "demo"}'
```

Response includes `environment_id`, `status: running`, and a browser `url`. Open the URL to access VS Code Web with the mounted workspace folder.

## Configuration

All settings are in `.env`. See `.env.example` for the full list with descriptions.

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_PUBLIC_URL` | *(required)* | Base URL used in returned environment links |
| `WORKSPACE_ROOT` | *(required)* | Absolute host path for workspace mounts |
| `MANAGED_NETWORK_NAME` | `vscode-manager-net` | Docker network name |
| `WORKSPACE_CONTAINER_ROOT` | `/workspaces` | Workspace root inside the manager container |
| `VSCODE_IMAGE` | `gitpod/openvscode-server:latest` | VS Code Web image |
| `VSCODE_CONTAINER_PORT` | `3000` | Port VS Code listens on inside containers |
| `CONTAINER_NAME_PREFIX` | `vscode-env-` | Prefix for managed container names |
| `ENV_LABEL_PREFIX` | `com.vscode-manager` | Prefix for labels on managed containers |
| `MAX_ENVIRONMENTS` | `10` | Maximum number of managed environments |
| `LOG_LEVEL` | `INFO` | Application logging level |
