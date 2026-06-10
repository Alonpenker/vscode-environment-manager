import { http, HttpResponse } from "msw";
import { healthOk, makeEnvironment } from "./fixtures";

// Default happy-path handlers. Individual tests override as needed via
// server.use(...).
export const handlers = [
  http.get("/api/health", () => HttpResponse.json(healthOk)),

  http.get("/api/environments", () =>
    HttpResponse.json([
      makeEnvironment({ id: "run1", status: "running" }),
      makeEnvironment({
        id: "stop1",
        status: "stopped",
        workspace: {
          requested_path: "alpha",
          resolved_host_path: "/host/alpha",
          container_path: "/workspaces/alpha",
        },
      }),
    ]),
  ),

  http.get("/api/environments/:id", ({ params }) =>
    HttpResponse.json(makeEnvironment({ id: String(params.id) })),
  ),

  http.get("/api/environments/:id/logs", () =>
    HttpResponse.json({ logs: "starting openvscode-server...\nlistening on 3000" }),
  ),

  http.post("/api/environments", async ({ request }) => {
    const body = (await request.json()) as { mount_folder: string };
    const env = makeEnvironment({
      id: "new123",
      status: "running",
      workspace: {
        requested_path: body.mount_folder,
        resolved_host_path: `/host/${body.mount_folder}`,
        container_path: `/workspaces/${body.mount_folder}`,
      },
    });
    return HttpResponse.json({
      success: true,
      operation: "create",
      environment_id: env.id,
      message: "Environment created",
      environment: env,
    });
  }),

  http.post("/api/environments/:id/start", ({ params }) =>
    HttpResponse.json({
      success: true,
      operation: "start",
      environment_id: String(params.id),
      message: "Environment started",
      environment: makeEnvironment({ id: String(params.id), status: "running" }),
    }),
  ),

  http.post("/api/environments/:id/stop", ({ params }) =>
    HttpResponse.json({
      success: true,
      operation: "stop",
      environment_id: String(params.id),
      message: "Environment stopped",
      environment: makeEnvironment({ id: String(params.id), status: "stopped" }),
    }),
  ),

  http.delete("/api/environments/:id", ({ params }) =>
    HttpResponse.json({
      success: true,
      operation: "delete",
      environment_id: String(params.id),
      message: "Environment removed",
    }),
  ),

  http.post("/api/environments/cleanup", () =>
    HttpResponse.json({
      success: true,
      operation: "cleanup",
      message: "Removed 1 environment",
    }),
  ),
];
