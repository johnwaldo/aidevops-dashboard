import { useApiData } from "@/hooks/useApiData";
import { MetricCard } from "@/components/shared/MetricCard";
import { DollarSign, TrendingUp, Calendar, Hash, Flame, Target } from "lucide-react";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

interface BudgetStatus {
  monthlyCap: number;
  currentMonth: number;
  today: number;
  thisWeek: number;
  usedPct: number;
  projectedMonthEnd: number;
  projectedPct: number;
  dailyAvg: number;
  dailyBurnRate: number;
  daysRemaining: number;
  status: "ok" | "warn" | "alert" | "critical" | "exceeded";
}

interface TokensData {
  budget: {
    today: number;
    thisWeek: number;
    currentMonth: number;
    dailyHistory: number[];
  };
  budgetStatus: BudgetStatus;
  totalRequests: number;
  totalCost: number;
}

const statusColors: Record<string, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  alert: "bg-orange-500",
  critical: "bg-rose-500",
  exceeded: "bg-rose-600",
};

const statusLabels: Record<string, string> = {
  ok: "On Track",
  warn: "Warning",
  alert: "Alert",
  critical: "Critical",
  exceeded: "Exceeded",
};

export function BudgetDashboard() {
  const { data: tokens, loading, error, refresh } = useApiData<TokensData>("tokens", 60);

  if (!tokens) {
    return <LoadingPanel loading={loading} error={error} onRetry={refresh}><div /></LoadingPanel>;
  }

  const { budget, budgetStatus: bs } = tokens;
  const todayDiff = bs.dailyAvg > 0 ? Math.round(((budget.today - bs.dailyAvg) / bs.dailyAvg) * 100) : 0;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {/* Budget progress bar */}
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Monthly Budget</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${statusColors[bs.status]}`}>
              {statusLabels[bs.status]}
            </span>
          </div>
          <span className="text-xs font-mono text-[#71717a]">
            ${bs.currentMonth.toFixed(0)} / ${bs.monthlyCap} ({bs.usedPct}%)
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-[#1e1e2e] overflow-hidden">
          {/* Current spend */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${statusColors[bs.status]}`}
            style={{ width: `${Math.min(bs.usedPct, 100)}%`, opacity: 0.8 }}
          />
          {/* Projected spend (dotted overlay) */}
          {bs.projectedPct > bs.usedPct && (
            <div
              className="absolute inset-y-0 rounded-full bg-white/10"
              style={{ left: `${Math.min(bs.usedPct, 100)}%`, width: `${Math.min(bs.projectedPct - bs.usedPct, 100 - bs.usedPct)}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-[#71717a]">
          <span>Projected: ${bs.projectedMonthEnd.toFixed(0)} ({bs.projectedPct}%)</span>
          <span>{bs.daysRemaining}d remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Today's Spend"
          value={`$${budget.today.toFixed(2)}`}
          trend={`${todayDiff >= 0 ? "+" : ""}${todayDiff}% vs avg`}
          trendUp={todayDiff <= 0}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          label="This Week"
          value={`$${budget.thisWeek.toFixed(2)}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="This Month"
          value={`$${budget.currentMonth.toFixed(2)}`}
          icon={<Calendar className="h-4 w-4" />}
        />
        <MetricCard
          label="Daily Burn Rate"
          value={`$${bs.dailyBurnRate.toFixed(2)}`}
          trend={`avg $${bs.dailyAvg.toFixed(2)}`}
          trendUp={bs.dailyBurnRate <= bs.dailyAvg}
          icon={<Flame className="h-4 w-4" />}
        />
        <MetricCard
          label="Projected End"
          value={`$${bs.projectedMonthEnd.toFixed(0)}`}
          trend={`${bs.projectedPct.toFixed(0)}% of cap`}
          trendUp={bs.projectedPct <= 100}
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Requests"
          value={tokens.totalRequests.toLocaleString()}
          icon={<Hash className="h-4 w-4" />}
        />
      </div>
    </LoadingPanel>
  );
}
