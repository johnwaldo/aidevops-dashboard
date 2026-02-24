import { tokensMock } from "@/lib/mock-data";
import { Sparkline } from "@/components/shared/Sparkline";

export function TokenBudgetBar() {
  const { budget, byModel } = tokensMock;
  const dailyAvg = budget.currentMonth / 24; // rough avg for the month so far
  const diff = budget.today - dailyAvg;
  const diffPct = Math.round((diff / dailyAvg) * 100);

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Token Spend Today</h3>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold font-[JetBrains_Mono]">${budget.today.toFixed(2)}</p>
          <p className="text-xs font-mono text-[#71717a] mt-1">
            {diffPct >= 0 ? "+" : ""}{diffPct}% vs daily avg
          </p>
        </div>
        <Sparkline data={budget.dailyHistory} className="text-cyan-400 opacity-60" width={80} height={24} />
      </div>
      <div className="mt-3 space-y-1.5">
        {byModel.slice(0, 3).map((m) => (
          <div key={m.model} className="flex items-center gap-2">
            <span className="text-[10px] text-[#71717a] w-20 truncate font-mono">{m.model}</span>
            <div className="flex-1 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500/60"
                style={{ width: `${m.pct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#71717a]">${m.cost.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
