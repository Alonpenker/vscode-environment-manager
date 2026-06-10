import type { z } from "zod";
import type {
  containerInfoSchema,
  environmentSchema,
  environmentStatusSchema,
  healthResponseSchema,
  logsResponseSchema,
  networkInfoSchema,
  operationResponseSchema,
  workspaceInfoSchema,
} from "./schemas";

export type EnvironmentStatus = z.infer<typeof environmentStatusSchema>;
export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;
export type ContainerInfo = z.infer<typeof containerInfoSchema>;
export type NetworkInfo = z.infer<typeof networkInfoSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type OperationResponse = z.infer<typeof operationResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type LogsResponse = z.infer<typeof logsResponseSchema>;
