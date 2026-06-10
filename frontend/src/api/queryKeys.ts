// Stable TanStack Query key factories. Centralised so cache reads,
// invalidations, and prefetches stay consistent across the app.
export const queryKeys = {
  health: ["health"] as const,
  environments: ["environments"] as const,
  environment: (id: string) => ["environments", id] as const,
  logs: (id: string) => ["environments", id, "logs"] as const,
};
