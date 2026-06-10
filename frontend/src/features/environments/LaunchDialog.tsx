import { useEffect, useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseLifecycleReturn } from "./useLifecycle";

interface LaunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lifecycle: UseLifecycleReturn;
}

function LaunchDialog({
  open,
  onOpenChange,
  lifecycle,
}: LaunchDialogProps): React.ReactElement {
  const { create } = lifecycle;
  const [folder, setFolder] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset transient state whenever the dialog is opened fresh.
  useEffect(() => {
    if (open) {
      setError(null);
      create.reset();
    }
    // create.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pending = create.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmed = folder.trim();
    if (!trimmed) {
      setError("Enter a workspace folder to launch.");
      return;
    }
    create.mutate(trimmed, {
      onSuccess: () => {
        setFolder("");
        onOpenChange(false);
      },
      onError: (err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong while launching the environment.",
        );
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return; // block closing while provisioning
        onOpenChange(next);
      }}
    >
      <DialogContent hideClose={pending}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Launch Environment
          </DialogTitle>
          <DialogDescription>
            Paths are resolved under the configured workspace root on the host.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mount-folder">Workspace folder</Label>
            <Input
              id="mount-folder"
              name="mount-folder"
              autoFocus
              placeholder="demo"
              value={folder}
              disabled={pending}
              onChange={(e) => setFolder(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "mount-folder-error" : undefined}
            />
            {error && (
              <p
                id="mount-folder-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          {pending ? (
            <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface-elevated/60 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Provisioning environment…
            </div>
          ) : (
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Rocket className="h-4 w-4" />
                Launch Environment
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LaunchDialog;
