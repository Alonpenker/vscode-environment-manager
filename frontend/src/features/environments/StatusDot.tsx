import type { EnvironmentStatus } from "@/api/types";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./status";

interface StatusDotProps {
  status: EnvironmentStatus;
  className?: string;
}

/** Animated status indicator dot. Animation is decorative only. */
function StatusDot({ status, className }: StatusDotProps): React.ReactElement {
  const meta = STATUS_META[status];
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)} aria-hidden="true">
      {meta.pulses && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-status-ping rounded-full",
            meta.dotClass,
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          meta.dotClass,
        )}
      />
    </span>
  );
}

export default StatusDot;
