import { Rocket, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onLaunch: () => void;
}

function EmptyState({ onLaunch }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 py-20 text-center">
      <div
        aria-hidden="true"
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background/60 text-primary shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]"
      >
        <TerminalSquare className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        No active environments
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Spin up a browser-based VS Code workspace backed by a Docker container.
        Launch your first environment to get started.
      </p>
      <Button size="lg" className="mt-6" onClick={onLaunch}>
        <Rocket className="h-4 w-4" />
        Launch First Environment
      </Button>
    </div>
  );
}

export default EmptyState;
