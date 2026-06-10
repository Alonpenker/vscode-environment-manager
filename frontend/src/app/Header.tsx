import { MoreVertical, RefreshCw, Rocket, SquareTerminal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HealthBadge from "@/features/health/HealthBadge";

interface HeaderProps {
  onLaunch: () => void;
  onRefresh: () => void;
  onCleanup: () => void;
  refreshing: boolean;
  cleaningUp: boolean;
}

function Header({
  onLaunch,
  onRefresh,
  onCleanup,
  refreshing,
  cleaningUp,
}: HeaderProps): React.ReactElement {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-primary shadow-[0_0_24px_-8px_hsl(var(--primary)/0.7)]"
        >
          <SquareTerminal className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-foreground">
            VS Code Environment Manager
          </h1>
          <p className="text-xs text-muted-foreground">
            Browser-based workspaces, on demand
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <HealthBadge />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Maintenance</DropdownMenuLabel>
            <DropdownMenuItem disabled={refreshing} onSelect={onRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={cleaningUp} onSelect={onCleanup}>
              <Trash className="h-4 w-4" />
              Cleanup stopped environments
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="lg" onClick={onLaunch} className="px-5">
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">Launch Environment</span>
          <span className="sm:hidden">Launch</span>
        </Button>
      </div>
    </header>
  );
}

export default Header;
