import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getHealth } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import type { HealthResponse } from "@/api/types";

/** Polls system health every 30 seconds. */
export function useHealth(): UseQueryResult<HealthResponse, Error> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}
