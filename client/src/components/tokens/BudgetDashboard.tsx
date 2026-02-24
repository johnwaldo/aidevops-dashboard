import { useApiData } from "@/hooks/useApiData";
import { MetricCard } from "@/components/shared/MetricCard";
import { DollarSign, TrendingUp, Calendar, Hash } from "lucide-react";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

interface TokensData {
  budget: {
    today: number;
    thisWeek: number;
    currentMonth: number;
    dailyHistory: number[];
  };
  totalRequests: number;
  totalCost: number;
}

export function BudgetDashboard() {
  const { data: tokens, loading, error, refresh } = useApiData<TokensData>("tokens", 60);

  if (!tokens) {
    return <LoadingPanel loading={loading} error={error} onRetry={refresh}><div /></LoadingPanel>;
  }

  const { budget } = tokens;
  const historyLen = budget.dailyHistory.length || 1;
  const dailyAvg = budget.currentMonth / historyLen;
  const todayDiff = dailyAvg > 0 ? Math.round(((budget.today - dailyAvg) / dailyAvg) * 100) : 0;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="grid grid-cols-4 gap-4">
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
          label="Total Requests"
          value={tokens.totalRequests.toLocaleString()}
          icon={<Hash className="h-4 w-4" />}
        />
      </div>
    </LoadingPanel>
  );
}
