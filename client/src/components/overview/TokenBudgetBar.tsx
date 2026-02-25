import { useApiData } from "@/hooks/useApiData";
import { Sparkline } from "@/components/shared/Sparkline";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

const statusColors: Record<string, string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  alert: "text-orange-400",
  critical: "text-rose-400",
  exceeded: "text-rose-500",
};

export function TokenBudgetBar() {
  const { data: tokens, loading, error, refresh } = useApiData<{
    budget: { today: number; currentMonth: number; dailyHistory: number[] };
    budgetStatus: { monthlyCap: number; usedPct: number; projectedMonthEnd: number; status: string; dailyBurnRate: number };
    byModel: { model: string; cost: number; pct: number }[];
  }>("tokens", 300);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {tokens && (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Token Spend Today</h3>
            <span className={`text-[10px] font-mono font-medium ${statusColors[tokens.budgetStatus.status]}`}>
              {tokens.budgetStatus.usedPct}% of ${tokens.budgetStatus.monthlyCap}
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold font-[JetBrains_Mono]">${tokens.budget.today.toFixed(2)}</p>
              <p className="text-xs font-mono text-[#71717a] mt-1">
                ${tokens.budget.currentMonth.toFixed(0)} this month &middot; ${tokens.budgetStatus.dailyBurnRate.toFixed(0)}/day burn
              </p>
            </div>
            <Sparkline data={tokens.budget.dailyHistory} className="text-cyan-400 opacity-60" width={80} height={24} />
          </div>
          {/* Mini budget bar */}
          <div className="mt-3 h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${tokens.budgetStatus.status === "ok" ? "bg-emerald-500" : tokens.budgetStatus.status === "warn" ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${Math.min(tokens.budgetStatus.usedPct, 100)}%` }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {tokens.byModel.slice(0, 3).map((m) => (
              <div key={m.model} className="flex items-center gap-2">
                <span className="text-[10px] text-[#71717a] w-20 truncate font-mono">{m.model}</span>
                <div className="flex-1 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${m.pct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">${m.cost.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
