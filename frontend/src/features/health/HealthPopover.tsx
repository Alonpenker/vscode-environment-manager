import { Check, X } from "lucide-react";
import type { HealthResponse } from "@/api/types";
import { cn } from "@/lib/utils";

interface HealthPopoverProps {
  health: HealthResponse | undefined;
  isError: boolean;
}

function CheckRow({
  label,
  value,
}: {
  label: string;
  value: boolean | undefined;
}): React.ReactElement {
  const ok = value === true;
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5 font-medium",
          ok ? "text-status-running" : "text-status-error",
        )}
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {ok ? "Available" : "Unavailable"}
      </span>
    </div>
  );
}

function HealthPopover({
  health,
  isError,
}: HealthPopoverProps): React.ReactElement {
  const lastCheck = health?.timestamp
    ? new Date(health.timestamp).toLocaleTimeString()
    : "—";

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">System health</h3>
        <p className="text-xs text-muted-foreground">
          {isError
            ? "Unable to reach the health endpoint."
            : health?.status === "ok"
              ? "Systems operational"
              : "System degraded"}
        </p>
      </div>
      <div className="divide-y divide-border/60">
        <CheckRow label="Docker" value={health?.docker_available} />
        <CheckRow label="API" value={health?.api_available} />
        <CheckRow label="Nginx" value={health?.nginx_available} />
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
        <span>Last check</span>
        <span className="font-mono">{lastCheck}</span>
      </div>
    </div>
  );
}

export default HealthPopover;
