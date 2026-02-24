import { StatusBadge } from "@/components/shared/StatusBadge";
import { systemMock, tokensMock, needsMock } from "@/lib/mock-data";

export function TopBar() {
  const budgetPct = Math.round((tokensMock.budget.currentMonth / tokensMock.budget.monthlyCap) * 100);

  return (
    <header className="h-12 shrink-0 border-b border-[#1e1e2e] bg-[#111118] px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={systemMock.vps.status} label="VPS" />
          <StatusBadge status={systemMock.local.status} label="Local" />
          <StatusBadge status={systemMock.tailscale.status} label="Tailscale" />
        </div>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <span className="text-xs text-[#71717a] font-mono">
          Ollama: 2 models loaded &middot; 42.8 t/s
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a] font-mono">
            ${tokensMock.budget.currentMonth} / ${tokensMock.budget.monthlyCap}
          </span>
          <div className="h-1.5 w-24 rounded-full bg-[#1e1e2e] overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-400">
            {needsMock.length}
          </span>
          <span className="text-xs text-[#71717a]">needs</span>
        </div>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <span className="text-xs text-[#71717a] font-mono">2 active</span>
      </div>
    </header>
  );
}
