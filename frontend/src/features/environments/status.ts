import type { BadgeProps } from "@/components/ui/badge";
import type { EnvironmentStatus } from "@/api/types";

interface StatusMeta {
  label: string;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
  dotClass: string;
  pulses: boolean;
}

export const STATUS_META: Record<EnvironmentStatus, StatusMeta> = {
  running: {
    label: "Running",
    badgeVariant: "running",
    dotClass: "bg-status-running",
    pulses: true,
  },
  creating: {
    label: "Provisioning",
    badgeVariant: "creating",
    dotClass: "bg-status-creating",
    pulses: true,
  },
  stopped: {
    label: "Stopped",
    badgeVariant: "stopped",
    dotClass: "bg-status-stopped",
    pulses: false,
  },
  error: {
    label: "Error",
    badgeVariant: "error",
    dotClass: "bg-status-error",
    pulses: false,
  },
};
