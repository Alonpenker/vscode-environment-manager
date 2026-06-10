import { useEffect, useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getEnvironment, listEnvironments } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import type { Environment, EnvironmentStatus } from "@/api/types";
import { deriveDisplayName } from "@/lib/utils";

// Status ordering for the grid (lower = earlier).
const STATUS_ORDER: Record<EnvironmentStatus, number> = {
  running: 1,
  creating: 2,
  stopped: 3,
  error: 4,
};

/**
 * Sort environments: highlighted (newly created/reused) first, then by status
 * priority, then alphabetically by workspace display name.
 */
export function sortEnvironments(
  environments: Environment[],
  highlightedId: string | null,
): Environment[] {
  return [...environments].sort((a, b) => {
    if (highlightedId) {
      if (a.id === highlightedId && b.id !== highlightedId) return -1;
      if (b.id === highlightedId && a.id !== highlightedId) return 1;
    }
    const statusDelta = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDelta !== 0) return statusDelta;
    return deriveDisplayName(a.workspace.requested_path).localeCompare(
      deriveDisplayName(b.workspace.requested_path),
    );
  });
}

/**
 * Lists environments and polls every 10s while the tab is visible.
 * Polling pauses when the tab is hidden to avoid redundant requests.
 */
export function useEnvironmentList(): UseQueryResult<Environment[], Error> {
  const query = useQuery({
    queryKey: queryKeys.environments,
    queryFn: ({ signal }) => listEnvironments(signal),
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "hidden"
        ? false
        : 10_000,
    refetchIntervalInBackground: false,
  });

  // Resume an immediate refetch when the tab becomes visible again.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        void query.refetch();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
    // refetch identity is stable from react-query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}

/**
 * Fetches fresh details for a single environment while reusing the list entry
 * as placeholder data so the drawer renders instantly.
 */
export function useEnvironmentDetails(
  id: string | null,
): UseQueryResult<Environment, Error> {
  const queryClient = useQueryClient();

  return useQuery<Environment, Error>({
    queryKey: queryKeys.environment(id ?? "none"),
    queryFn: ({ signal }) => getEnvironment(id as string, signal),
    enabled: Boolean(id),
    placeholderData: () => {
      if (!id) return undefined;
      const list = queryClient.getQueryData<Environment[]>(
        queryKeys.environments,
      );
      return list?.find((env) => env.id === id);
    },
  });
}

/** Memoised sorted view of the environment list. */
export function useSortedEnvironments(
  environments: Environment[] | undefined,
  highlightedId: string | null,
): Environment[] {
  return useMemo(
    () => sortEnvironments(environments ?? [], highlightedId),
    [environments, highlightedId],
  );
}
