# VS Code Web Environment Manager

A local developer platform that creates browser-based VS Code environments backed by Docker containers. A single HTTP API lets you spin up, inspect, stop, and remove environments, each connected to a local workspace folder. A React dashboard provides a visual interface over the same API.

## Dashboard

Once the stack is running, open the dashboard at **http://localhost:8080/**. From there you can launch new environments, monitor status, open VS Code, inspect details and logs, and clean up stopped environments.

The dashboard is a static single-page app built with **React + TypeScript + Vite**, styled with **Tailwind CSS** and **shadcn/ui** primitives, animated with **Motion**, and backed by **TanStack Query** for server state. API responses are validated at runtime with **Zod**. It is served by the same Nginx container that proxies the API and the per-environment VS Code containers, so everything runs from a single origin.

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

Before starting, pull the VS Code Web image so the first environment creation doesn't time out:

```bash
docker pull gitpod/openvscode-server:latest
```

Then start the stack:

```bash
docker compose up --build
```

This single command builds both the manager API image and the Nginx image (which compiles the frontend in a multi-stage build) and starts the stack. Nginx listens on `http://localhost:8080` and serves the dashboard, the API under `/api/`, and the VS Code containers under `/env/{id}/`. The manager API is not directly exposed.

## Local frontend development (optional)

The dashboard is built and served automatically by `docker compose up --build`, so this step is only needed if you want hot-reloading while editing the UI.

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/env` (including WebSockets) to `http://localhost:8080`, so the running docker-compose stack must be up. Available scripts:

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the Vite dev server with API/env proxying |
| `npm run build` | Type-check and produce a production build in `frontend/dist/` |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler with no emit |
| `npm run test` | Run the Vitest unit/component suite |

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
