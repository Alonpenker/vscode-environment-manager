import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronDown,
  Copy,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { getLogs } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/useClipboard";
import { cn } from "@/lib/utils";

interface LogsSectionProps {
  environmentId: string;
}

/**
 * Terminal-styled logs panel. Logs are fetched lazily on first open and never
 * polled. Provides manual refresh and copy actions.
 */
function LogsSection({ environmentId }: LogsSectionProps): React.ReactElement {
  const [opened, setOpened] = useState(false);
  const { copied, copy } = useClipboard();

  const query = useQuery({
    queryKey: queryKeys.logs(environmentId),
    queryFn: ({ signal }) => getLogs(environmentId, signal),
    enabled: opened,
    staleTime: Infinity,
    refetchInterval: false,
  });

  const logs = query.data?.logs ?? "";
  const errorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : query.isError
        ? "Failed to load logs."
        : null;

  return (
    <section className="rounded-lg border border-border bg-background/60">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpened((v) => !v)}
          aria-expanded={opened}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <Terminal className="h-4 w-4 text-primary" />
          Container logs
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              opened && "rotate-180",
            )}
          />
        </button>
        {opened && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Refresh logs"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={copied ? "Logs copied" : "Copy logs"}
              disabled={!logs}
              onClick={() => void copy(logs)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {opened && (
        <div className="p-3">
          {query.isLoading ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Loading logs…
            </p>
          ) : errorMessage ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : logs.trim().length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              No log output yet.
            </p>
          ) : (
            <pre className="scrollbar-thin max-h-72 w-full overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/50 p-3 font-mono text-xs leading-relaxed text-foreground/90">
              {logs}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

export default LogsSection;
