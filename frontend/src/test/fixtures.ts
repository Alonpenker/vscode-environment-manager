import type { Environment, HealthResponse } from "@/api/types";

export function makeEnvironment(
  overrides: Partial<Environment> = {},
): Environment {
  return {
    id: "abc123def456",
    status: "running",
    url: "http://localhost:8080/env/abc123def456/",
    workspace: {
      requested_path: "demo",
      resolved_host_path: "/host/workspaces/demo",
      container_path: "/workspaces/demo",
    },
    container: {
      id: "container0001deadbeef",
      name: "vscode-env-abc123def456",
      image: "gitpod/openvscode-server:latest",
      labels: { "com.vscode-manager.id": "abc123def456" },
    },
    network: {
      network_name: "vscode-manager-net",
      network_id: "net0001deadbeef",
      ip_address: "172.18.0.5",
      connected: true,
    },
    error_message: null,
    ...overrides,
  };
}

export const healthOk: HealthResponse = {
  status: "ok",
  docker_available: true,
  nginx_available: true,
  api_available: true,
  timestamp: new Date("2026-06-10T12:00:00Z").toISOString(),
};
