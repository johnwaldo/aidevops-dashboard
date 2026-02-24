import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface LoadingPanelProps {
  loading: boolean;
  error: string | null;
  stale?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
  skeleton?: React.ReactNode;
}

function DefaultSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-[#1e1e2e]" />
      <div className="h-3 w-2/3 rounded bg-[#1e1e2e]" />
      <div className="h-3 w-1/2 rounded bg-[#1e1e2e]" />
      <div className="h-8 w-full rounded bg-[#1e1e2e]" />
    </div>
  );
}

export function LoadingPanel({ loading, error, stale, onRetry, children, className, skeleton }: LoadingPanelProps) {
  if (loading) {
    return (
      <div className={cn("rounded-md border border-[#1e1e2e] bg-[#111118] p-4", className)}>
        {skeleton ?? <DefaultSkeleton />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-md border border-rose-500/20 bg-[#111118] p-4", className)}>
        <div className="flex items-center gap-2 text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs font-mono truncate">{error}</span>
          {onRetry && (
            <button onClick={onRetry} className="ml-auto shrink-0 text-[#71717a] hover:text-[#e4e4e7] transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {stale && (
        <div className="absolute top-1 right-1 z-10">
          <span className="text-[9px] font-mono text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded">stale</span>
        </div>
      )}
      {children}
    </div>
  );
}

export function InlineLoading() {
  return <Loader2 className="h-4 w-4 animate-spin text-[#71717a]" />;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-8 text-center">
      <p className="text-sm text-[#71717a]">{message}</p>
    </div>
  );
}
