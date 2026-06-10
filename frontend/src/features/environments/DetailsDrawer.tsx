import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import type { Environment } from "@/api/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { deriveDisplayName, shortenId } from "@/lib/utils";
import { useEnvironmentDetails } from "./useEnvironments";
import type { UseLifecycleReturn } from "./useLifecycle";
import StatusBadge from "./StatusBadge";
import CopyButton from "./CopyButton";
import LogsSection from "./LogsSection";
import { openEnvironmentUrl } from "./openEnvironment";

interface DetailsDrawerProps {
  environmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lifecycle: UseLifecycleReturn;
  onRequestDelete: (environment: Environment) => void;
}

function DetailRow({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel?: string;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="w-28 shrink-0 pt-0.5 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-start justify-end gap-1">
        <span className="break-all text-right font-mono text-xs text-foreground/90">
          {value || "—"}
        </span>
        {copyLabel && value ? (
          <CopyButton value={value} label={copyLabel} />
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-lg border border-border bg-surface-elevated/40 p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="divide-y divide-border/50">{children}</div>
    </section>
  );
}

function DetailsDrawer({
  environmentId,
  open,
  onOpenChange,
  lifecycle,
  onRequestDelete,
}: DetailsDrawerProps): React.ReactElement {
  const { data: env, isLoading, isError, error } = useEnvironmentDetails(
    open ? environmentId : null,
  );
  const { start, stop, pendingId } = lifecycle;
  const pending = Boolean(env && pendingId === env.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="scrollbar-thin overflow-y-auto p-0">
        {env ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <SheetTitle className="truncate">
                    {deriveDisplayName(env.workspace.requested_path)}
                  </SheetTitle>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={env.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortenId(env.id, 16)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {env.status === "running" && (
                  <Button
                    size="sm"
                    onClick={() => openEnvironmentUrl(env.url)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open VS Code
                  </Button>
                )}
                {env.status === "stopped" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => start.mutate(env.id)}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start
                  </Button>
                )}
                {env.status === "running" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => stop.mutate(env.id)}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Stop
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onRequestDelete(env)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </SheetHeader>

            <div className="space-y-4 p-6">
              {env.error_message && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-words">{env.error_message}</span>
                </div>
              )}

              <Section title="Workspace">
                <DetailRow
                  label="Requested"
                  value={env.workspace.requested_path}
                  copyLabel="requested path"
                />
                <DetailRow
                  label="Resolved host"
                  value={env.workspace.resolved_host_path}
                  copyLabel="host path"
                />
                <DetailRow
                  label="Container"
                  value={env.workspace.container_path}
                  copyLabel="container path"
                />
              </Section>

              <Section title="Container">
                <DetailRow label="Name" value={env.container.name} copyLabel="container name" />
                <DetailRow
                  label="ID"
                  value={shortenId(env.container.id, 12)}
                  copyLabel="container id"
                />
                <DetailRow label="Image" value={env.container.image} copyLabel="image" />
              </Section>

              <Section title="Network">
                <DetailRow label="Name" value={env.network.network_name} copyLabel="network name" />
                <DetailRow
                  label="ID"
                  value={shortenId(env.network.network_id, 12)}
                  copyLabel="network id"
                />
                <DetailRow
                  label="IP address"
                  value={env.network.ip_address}
                  copyLabel="IP address"
                />
                <DetailRow
                  label="Connected"
                  value={env.network.connected ? "Yes" : "No"}
                />
              </Section>

              <LogsSection environmentId={env.id} />
            </div>
          </>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading environment…
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Unable to load environment details."}
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default DetailsDrawer;
