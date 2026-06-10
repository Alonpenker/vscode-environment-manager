import {
  Ellipsis,
  ExternalLink,
  Eye,
  Loader2,
  Play,
  Square,
  Trash2,
  Unplug,
  Wifi,
} from "lucide-react";
import type { Environment } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SpotlightCard from "@/components/effects/SpotlightCard";
import { cn, deriveDisplayName, shortenId } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

interface EnvironmentCardProps {
  environment: Environment;
  highlighted: boolean;
  pending: boolean;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
  onSelect: (environment: Environment) => void;
  onPrimaryAction: (environment: Environment) => void;
  onStart: (environment: Environment) => void;
  onStop: (environment: Environment) => void;
  onDelete: (environment: Environment) => void;
}

function MetaLine({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-foreground/90" title={value}>
        {value}
      </span>
    </div>
  );
}

function EnvironmentCard({
  environment,
  highlighted,
  pending,
  registerRef,
  onSelect,
  onPrimaryAction,
  onStart,
  onStop,
  onDelete,
}: EnvironmentCardProps): React.ReactElement {
  const name = deriveDisplayName(environment.workspace.requested_path);
  const isRunning = environment.status === "running";
  const isStopped = environment.status === "stopped";
  const isCreating = environment.status === "creating";
  const isError = environment.status === "error";

  const primaryLabel = isRunning
    ? "Open VS Code"
    : isStopped
      ? "Start Environment"
      : isCreating
        ? "Provisioning…"
        : "View Details";

  const PrimaryIcon = isRunning
    ? ExternalLink
    : isStopped
      ? Play
      : isError
        ? Eye
        : Loader2;

  const handleCardKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(environment);
    }
  };

  return (
    <SpotlightCard
      enabled={isRunning}
      className={cn(
        "rounded-xl",
        highlighted && "animate-highlight-pulse rounded-xl",
      )}
    >
      <div
        ref={(node) => registerRef(environment.id, node)}
        role="button"
        tabIndex={0}
        aria-label={`Open details for ${name}`}
        onClick={() => onSelect(environment)}
        onKeyDown={handleCardKey}
        className={cn(
          "group flex h-full cursor-pointer flex-col gap-4 rounded-xl border bg-surface/80 p-5 shadow-sm transition-colors hover:border-primary/40",
          highlighted ? "border-primary/60" : "border-border",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">
              {name}
            </h3>
            <div className="mt-2">
              <StatusBadge status={environment.status} />
            </div>
          </div>
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {environment.network.connected ? (
              <span
                className="flex items-center gap-1 text-xs text-status-running"
                title="Network connected"
              >
                <Wifi className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground"
                title="Network disconnected"
              >
                <Unplug className="h-3.5 w-3.5" />
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Environment actions"
                  disabled={pending}
                >
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onSelect(environment)}>
                  <Eye className="h-4 w-4" />
                  View details
                </DropdownMenuItem>
                {isStopped && (
                  <DropdownMenuItem
                    onSelect={() => onStart(environment)}
                    disabled={pending}
                  >
                    <Play className="h-4 w-4" />
                    Start
                  </DropdownMenuItem>
                )}
                {isRunning && (
                  <DropdownMenuItem
                    onSelect={() => onStop(environment)}
                    disabled={pending}
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onSelect={() => onDelete(environment)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1.5">
          <MetaLine
            label="Path"
            value={environment.workspace.requested_path}
          />
          <MetaLine label="ID" value={shortenId(environment.id, 16)} />
          <MetaLine label="Image" value={environment.container.image} />
        </div>

        <div className="mt-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant={isRunning ? "default" : isError ? "outline" : "secondary"}
            className="flex-1"
            disabled={isCreating || pending}
            onClick={() => onPrimaryAction(environment)}
          >
            {pending && isStopped ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PrimaryIcon
                className={cn("h-4 w-4", isCreating && "animate-spin")}
              />
            )}
            {primaryLabel}
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default EnvironmentCard;
