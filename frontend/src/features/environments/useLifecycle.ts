import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  cleanupEnvironments,
  createEnvironment,
  deleteEnvironment,
  startEnvironment,
  stopEnvironment,
} from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import type { Environment, OperationResponse } from "@/api/types";

/** Replace or insert an environment in the cached list. */
function upsertEnvironment(
  list: Environment[] | undefined,
  env: Environment,
): Environment[] {
  const current = list ?? [];
  const index = current.findIndex((item) => item.id === env.id);
  if (index === -1) return [...current, env];
  const next = [...current];
  next[index] = env;
  return next;
}

interface LifecycleCallbacks {
  /** Called with the created/reused environment id so it can be highlighted. */
  onCreated?: (environmentId: string) => void;
  /** Called after a successful delete so the drawer can close. */
  onDeleted?: (environmentId: string) => void;
}

/**
 * Surface a backend error as a toast. 409 lifecycle conflicts are non-fatal:
 * shown as a plain message and followed by a data refresh.
 */
function reportError(error: unknown, fallback: string): void {
  if (error instanceof ApiError) {
    toast(error.message);
    return;
  }
  toast.error(fallback);
}

export function useLifecycle(callbacks: LifecycleCallbacks = {}) {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.environments });
  };

  const applyOperationResult = (result: OperationResponse) => {
    if (result.environment) {
      const env = result.environment;
      queryClient.setQueryData<Environment[]>(queryKeys.environments, (list) =>
        upsertEnvironment(list, env),
      );
      queryClient.setQueryData(queryKeys.environment(env.id), env);
    }
  };

  const create = useMutation({
    mutationFn: (mountFolder: string) => createEnvironment(mountFolder),
    onSuccess: (result) => {
      applyOperationResult(result);
      const id = result.environment?.id ?? result.environment_id ?? undefined;
      void queryClient.invalidateQueries({ queryKey: queryKeys.environments });
      if (id) {
        if (result.environment) queryClient.setQueryData(queryKeys.environment(id), result.environment);
        callbacks.onCreated?.(id);
      }
      toast.success(result.message);
    },
  });

  const start = useMutation({
    mutationFn: (id: string) => startEnvironment(id),
    onSuccess: (result, id) => {
      applyOperationResult(result);
      void queryClient.invalidateQueries({ queryKey: queryKeys.environments });
      void queryClient.invalidateQueries({ queryKey: queryKeys.environment(id) });
      toast.success(result.message);
    },
    onError: (error) => {
      reportError(error, "Failed to start environment.");
      invalidateAll();
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => stopEnvironment(id),
    onSuccess: (result, id) => {
      applyOperationResult(result);
      void queryClient.invalidateQueries({ queryKey: queryKeys.environments });
      void queryClient.invalidateQueries({ queryKey: queryKeys.environment(id) });
      toast.success(result.message);
    },
    onError: (error) => {
      reportError(error, "Failed to stop environment.");
      invalidateAll();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEnvironment(id),
    onSuccess: (result, id) => {
      queryClient.setQueryData<Environment[]>(queryKeys.environments, (list) =>
        (list ?? []).filter((env) => env.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.environment(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.environments });
      callbacks.onDeleted?.(id);
      toast.success(result.message);
    },
    onError: (error) => {
      reportError(error, "Failed to delete environment.");
      invalidateAll();
    },
  });

  const cleanup = useMutation({
    mutationFn: () => cleanupEnvironments(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.environments });
      toast.success(result.message);
    },
    onError: (error) => {
      reportError(error, "Cleanup failed.");
      invalidateAll();
    },
  });

  /** Id of the environment with a start/stop/delete mutation in flight, if any. */
  const pendingId: string | null =
    (start.isPending && (start.variables ?? null)) ||
    (stop.isPending && (stop.variables ?? null)) ||
    (remove.isPending && (remove.variables ?? null)) ||
    null;

  return { create, start, stop, remove, cleanup, pendingId };
}

export type UseLifecycleReturn = ReturnType<typeof useLifecycle>;
