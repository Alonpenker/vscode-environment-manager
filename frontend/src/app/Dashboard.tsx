import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Environment } from "@/api/types";
import GridTexture from "@/components/effects/GridTexture";
import CyanGlow from "@/components/effects/CyanGlow";
import {
  useEnvironmentList,
  useSortedEnvironments,
} from "@/features/environments/useEnvironments";
import { useLifecycle } from "@/features/environments/useLifecycle";
import { openEnvironmentUrl } from "@/features/environments/openEnvironment";
import MetricsRow from "@/features/environments/MetricsRow";
import EnvironmentGrid from "@/features/environments/EnvironmentGrid";
import EnvironmentGridSkeleton from "@/features/environments/EnvironmentGridSkeleton";
import EmptyState from "@/features/environments/EmptyState";
import ListErrorPanel from "@/features/environments/ListErrorPanel";
import LaunchDialog from "@/features/environments/LaunchDialog";
import DetailsDrawer from "@/features/environments/DetailsDrawer";
import DeleteConfirmDialog from "@/features/environments/DeleteConfirmDialog";
import Header from "./Header";

const HIGHLIGHT_MS = 4000;

function Dashboard(): React.ReactElement {
  const {
    data: environments,
    isLoading,
    isError,
    error,
    isFetching,
    isSuccess,
    refetch,
    failureCount,
  } = useEnvironmentList();

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Environment | null>(null);

  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  // Whether the entrance stagger has already played. Capture the value for the
  // current render *before* flipping it, so the first successful render still
  // animates but later renders do not.
  const entrancePlayed = useRef(false);
  const playEntranceNow = isSuccess && !entrancePlayed.current;
  if (isSuccess) entrancePlayed.current = true;

  const registerRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) cardRefs.current.set(id, node);
    else cardRefs.current.delete(id);
  }, []);

  const lifecycle = useLifecycle({
    onCreated: (id) => {
      setHighlightedId(id);
      // Scroll the new card into view on the next paint.
      requestAnimationFrame(() => {
        const node = cardRefs.current.get(id);
        node?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    onDeleted: (id) => {
      if (selectedId === id) {
        setDrawerOpen(false);
        setSelectedId(null);
      }
      if (deleteTarget?.id === id) setDeleteTarget(null);
    },
  });

  // Clear the highlight after ~4s.
  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  // Background polling failure: data is still present but a refetch failed.
  // Surface a single non-blocking warning toast.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (isError && environments && failureCount > 0 && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning("Live updates paused — showing last known data.", {
        id: "polling-warning",
      });
    }
    if (!isError) warnedRef.current = false;
  }, [isError, environments, failureCount]);

  const sorted = useSortedEnvironments(environments, highlightedId);

  const handleSelect = useCallback((environment: Environment) => {
    setSelectedId(environment.id);
    setDrawerOpen(true);
  }, []);

  const handlePrimaryAction = useCallback(
    (environment: Environment) => {
      switch (environment.status) {
        case "running":
          openEnvironmentUrl(environment.url);
          break;
        case "stopped":
          lifecycle.start.mutate(environment.id);
          break;
        case "error":
          handleSelect(environment);
          break;
        default:
          break;
      }
    },
    [lifecycle, handleSelect],
  );

  const handleConfirmDelete = useCallback(
    (environment: Environment) => {
      lifecycle.remove.mutate(environment.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    },
    [lifecycle],
  );

  const showSkeleton = isLoading && !environments;
  const showEmpty = !isLoading && !isError && sorted.length === 0;
  const showError = isError && !environments;

  return (
    <div className="relative min-h-screen">
      <GridTexture />
      <CyanGlow />

      <div className="mx-auto w-full max-w-dashboard px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Header
          onLaunch={() => setLaunchOpen(true)}
          onRefresh={() => void refetch()}
          onCleanup={() => lifecycle.cleanup.mutate()}
          refreshing={isFetching}
          cleaningUp={lifecycle.cleanup.isPending}
        />

        <main className="mt-8 space-y-8">
          <MetricsRow environments={environments} isLoading={showSkeleton} />

          <section aria-label="Environments">
            {showSkeleton ? (
              <EnvironmentGridSkeleton />
            ) : showError ? (
              <ListErrorPanel error={error} onRetry={() => void refetch()} />
            ) : showEmpty ? (
              <EmptyState onLaunch={() => setLaunchOpen(true)} />
            ) : (
              <EnvironmentGrid
                environments={sorted}
                highlightedId={highlightedId}
                pendingId={lifecycle.pendingId}
                animateEntrance={playEntranceNow}
                registerRef={registerRef}
                onSelect={handleSelect}
                onPrimaryAction={handlePrimaryAction}
                onStart={(env) => lifecycle.start.mutate(env.id)}
                onStop={(env) => lifecycle.stop.mutate(env.id)}
                onDelete={(env) => setDeleteTarget(env)}
              />
            )}
          </section>
        </main>
      </div>

      <LaunchDialog
        open={launchOpen}
        onOpenChange={setLaunchOpen}
        lifecycle={lifecycle}
      />

      <DetailsDrawer
        environmentId={selectedId}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedId(null);
        }}
        lifecycle={lifecycle}
        onRequestDelete={(env) => setDeleteTarget(env)}
      />

      <DeleteConfirmDialog
        environment={deleteTarget}
        open={Boolean(deleteTarget)}
        pending={
          Boolean(deleteTarget) &&
          lifecycle.remove.isPending &&
          lifecycle.remove.variables === deleteTarget?.id
        }
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default Dashboard;
