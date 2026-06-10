import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";

interface ListErrorPanelProps {
  error: unknown;
  onRetry: () => void;
}

function ListErrorPanel({
  error,
  onRetry,
}: ListErrorPanelProps): React.ReactElement {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unable to load environments.";

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-12 text-center"
    >
      <AlertTriangle className="h-7 w-7 text-destructive" />
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Couldn’t load environments
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

export default ListErrorPanel;
