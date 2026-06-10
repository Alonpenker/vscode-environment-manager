import { Activity } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useHealth } from "./useHealth";
import HealthPopover from "./HealthPopover";

type HealthState = "healthy" | "degraded" | "unknown";

function HealthBadge(): React.ReactElement {
  const { data, isError, isLoading } = useHealth();

  let state: HealthState = "unknown";
  if (!isLoading && !isError && data) {
    state = data.status === "ok" ? "healthy" : "degraded";
  } else if (isError) {
    state = "degraded";
  }

  const label =
    state === "healthy"
      ? "Systems operational"
      : state === "degraded"
        ? "System degraded"
        : "Checking…";

  const dotColor =
    state === "healthy"
      ? "bg-status-running"
      : state === "degraded"
        ? "bg-status-error"
        : "bg-muted-foreground";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`System health: ${label}. Open details.`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="relative flex h-2.5 w-2.5">
            {state === "healthy" && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inline-flex h-full w-full animate-status-ping rounded-full",
                  dotColor,
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                dotColor,
              )}
            />
          </span>
          <Activity className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <HealthPopover health={data} isError={isError} />
      </PopoverContent>
    </Popover>
  );
}

export default HealthBadge;
