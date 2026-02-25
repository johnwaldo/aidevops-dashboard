import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading: externalLoading,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = externalLoading ?? internalLoading;

  async function handleConfirm() {
    setError(null);
    setInternalLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInternalLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-[#111118] border-[#1e1e2e]">
        <DialogHeader>
          <DialogTitle className="text-[#e4e4e7] font-[Plus_Jakarta_Sans]">{title}</DialogTitle>
          <DialogDescription className="text-[#71717a] text-sm mt-2">{description}</DialogDescription>
        </DialogHeader>

        {destructive && (
          <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3">
            <p className="text-xs text-rose-400">This action cannot be undone.</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3">
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              destructive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-cyan-600 hover:bg-cyan-700 text-white"
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Working...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
