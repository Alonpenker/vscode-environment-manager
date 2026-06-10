import { apiRequest } from "./client";
import {
  environmentListSchema,
  environmentSchema,
  healthResponseSchema,
  logsResponseSchema,
  operationResponseSchema,
} from "./schemas";
import type {
  Environment,
  HealthResponse,
  LogsResponse,
  OperationResponse,
} from "./types";

// Endpoint functions kept separate from React components. All paths are
// same-origin and relative so they work identically behind Nginx and the
// Vite dev proxy.

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest("/api/health", { schema: healthResponseSchema, signal });
}

export function listEnvironments(signal?: AbortSignal): Promise<Environment[]> {
  return apiRequest("/api/environments", {
    schema: environmentListSchema,
    signal,
  });
}

export function getEnvironment(
  id: string,
  signal?: AbortSignal,
): Promise<Environment> {
  return apiRequest(`/api/environments/${id}`, {
    schema: environmentSchema,
    signal,
  });
}

export function getLogs(id: string, signal?: AbortSignal): Promise<LogsResponse> {
  return apiRequest(`/api/environments/${id}/logs`, {
    schema: logsResponseSchema,
    signal,
  });
}

export function createEnvironment(
  mountFolder: string,
): Promise<OperationResponse> {
  return apiRequest("/api/environments", {
    method: "POST",
    body: { mount_folder: mountFolder },
    schema: operationResponseSchema,
  });
}

export function startEnvironment(id: string): Promise<OperationResponse> {
  return apiRequest(`/api/environments/${id}/start`, {
    method: "POST",
    schema: operationResponseSchema,
  });
}

export function stopEnvironment(id: string): Promise<OperationResponse> {
  return apiRequest(`/api/environments/${id}/stop`, {
    method: "POST",
    schema: operationResponseSchema,
  });
}

export function deleteEnvironment(id: string): Promise<OperationResponse> {
  return apiRequest(`/api/environments/${id}`, {
    method: "DELETE",
    schema: operationResponseSchema,
  });
}

export function cleanupEnvironments(): Promise<OperationResponse> {
  return apiRequest("/api/environments/cleanup", {
    method: "POST",
    schema: operationResponseSchema,
  });
}
