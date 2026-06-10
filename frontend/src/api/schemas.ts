import { z } from "zod";

// Schemas mirror the FastAPI Pydantic models in manager/app/schemas.
// Every successful API response is validated against these before use.

export const environmentStatusSchema = z.enum([
  "running",
  "stopped",
  "creating",
  "error",
]);

export const workspaceInfoSchema = z.object({
  requested_path: z.string(),
  resolved_host_path: z.string(),
  container_path: z.string(),
});

export const containerInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  labels: z.record(z.string(), z.string()),
});

export const networkInfoSchema = z.object({
  network_name: z.string(),
  network_id: z.string(),
  ip_address: z.string(),
  connected: z.boolean(),
});

export const environmentSchema = z.object({
  id: z.string(),
  status: environmentStatusSchema,
  url: z.string(),
  workspace: workspaceInfoSchema,
  container: containerInfoSchema,
  network: networkInfoSchema,
  error_message: z.string().nullable().optional(),
});

export const environmentListSchema = z.array(environmentSchema);

export const operationResponseSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  environment_id: z.string().nullable().optional(),
  message: z.string(),
  environment: environmentSchema.nullable().optional(),
  error_code: z.string().nullable().optional(),
});

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  docker_available: z.boolean(),
  nginx_available: z.boolean(),
  api_available: z.boolean(),
  timestamp: z.string(),
});

export const logsResponseSchema = z.object({
  logs: z.string(),
});
