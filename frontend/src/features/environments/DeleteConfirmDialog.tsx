import { Loader2, Trash2 } from "lucide-react";
import type { Environment } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deriveDisplayName, shortenId } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  environment: Environment | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (environment: Environment) => void;
}

function DeleteConfirmDialog({
  environment,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps): React.ReactElement | null {
  if (!environment) return null;
  const name = deriveDisplayName(environment.workspace.requested_path);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent hideClose={pending} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete environment
          </DialogTitle>
          <DialogDescription>
            This permanently removes the environment and its container. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-md border border-border bg-surface-elevated/60 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Workspace</span>
            <span className="font-mono text-foreground">{name}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Environment ID</span>
            <span className="font-mono text-foreground">
              {shortenId(environment.id, 20)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => onConfirm(environment)}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete environment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteConfirmDialog;
