import { useMemo } from "react";
import { Boxes, CircleSlash, Play, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Environment } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricsRowProps {
  environments: Environment[] | undefined;
  isLoading: boolean;
}

interface Metric {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}

function MetricCard({ metric }: { metric: Metric }): React.ReactElement {
  const Icon = metric.icon;
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface/80 p-4 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
          metric.tone,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-2xl font-semibold leading-none text-foreground tabular-nums">
          {metric.value}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {metric.label}
        </div>
      </div>
    </div>
  );
}

function MetricsRow({
  environments,
  isLoading,
}: MetricsRowProps): React.ReactElement {
  const metrics = useMemo<Metric[]>(() => {
    const list = environments ?? [];
    const count = (status: Environment["status"]) =>
      list.filter((env) => env.status === status).length;
    return [
      {
        key: "total",
        label: "Total environments",
        value: list.length,
        icon: Boxes,
        tone: "bg-primary/15 text-primary",
      },
      {
        key: "running",
        label: "Running",
        value: count("running"),
        icon: Play,
        tone: "bg-status-running/15 text-status-running",
      },
      {
        key: "stopped",
        label: "Stopped",
        value: count("stopped"),
        icon: CircleSlash,
        tone: "bg-status-stopped/15 text-status-stopped",
      },
      {
        key: "error",
        label: "Errors",
        value: count("error"),
        icon: TriangleAlert,
        tone: "bg-status-error/15 text-status-error",
      },
    ];
  }, [environments]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}

export default MetricsRow;
