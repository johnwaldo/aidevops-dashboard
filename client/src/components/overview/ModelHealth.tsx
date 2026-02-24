import { useApiData } from "@/hooks/useApiData";
import { cn } from "@/lib/utils";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

export function ModelHealth() {
  const { data: tokens, loading, error, refresh } = useApiData<{
    byModel: { model: string; requests: number; cost: number }[];
    totalRequests: number;
  }>("tokens", 300);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Model Usage</h3>
        <div className="space-y-2.5">
          {(tokens?.byModel ?? []).map((m) => {
            const pct = tokens?.totalRequests ? Math.round((m.requests / tokens.totalRequests) * 100) : 0;
            return (
              <div key={m.model} className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#e4e4e7] w-20 truncate">{m.model}</span>
                <div className="flex-1 flex items-center gap-3">
                  <span className={cn("text-xs font-mono font-semibold", "text-cyan-400")}>{m.requests}</span>
                  <div className="flex-1 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#71717a]">${m.cost.toFixed(0)}</span>
                </div>
              </div>
            );
          })}
          {(!tokens?.byModel || tokens.byModel.length === 0) && (
            <p className="text-xs text-[#71717a] text-center py-2">No model data</p>
          )}
        </div>
      </div>
    </LoadingPanel>
  );
}
