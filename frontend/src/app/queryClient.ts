import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";

/**
 * Single shared QueryClient. Window-focus refetch is disabled to avoid
 * redundant requests (polling + post-mutation invalidation cover freshness).
 * 409 conflicts are non-fatal lifecycle states and are never retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (error.status === 404 || error.isConflict) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
