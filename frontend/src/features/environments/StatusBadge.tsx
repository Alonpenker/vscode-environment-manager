import { Badge } from "@/components/ui/badge";
import type { EnvironmentStatus } from "@/api/types";
import StatusDot from "./StatusDot";
import { STATUS_META } from "./status";

interface StatusBadgeProps {
  status: EnvironmentStatus;
}

function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.badgeVariant}>
      <StatusDot status={status} />
      {meta.label}
    </Badge>
  );
}

export default StatusBadge;
