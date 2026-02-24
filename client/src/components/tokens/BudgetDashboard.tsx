import { tokensMock } from "@/lib/mock-data";
import { MetricCard } from "@/components/shared/MetricCard";
import { DollarSign, TrendingUp, Calendar, Target } from "lucide-react";

export function BudgetDashboard() {
  const { budget } = tokensMock;
  const dailyAvg = budget.currentMonth / 24;
  const todayDiff = Math.round(((budget.today - dailyAvg) / dailyAvg) * 100);
  const budgetPct = Math.round((budget.projectedMonth / budget.monthlyCap) * 100);

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="Today's Spend"
        value={`$${budget.today.toFixed(2)}`}
        trend={`${todayDiff >= 0 ? "+" : ""}${todayDiff}% vs avg`}
        trendUp={todayDiff > 0 ? false : true}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <MetricCard
        label="This Week"
        value={`$${budget.thisWeek.toFixed(2)}`}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricCard
        label="This Month"
        value={`$${budget.currentMonth.toFixed(0)} / $${budget.monthlyCap}`}
        trend={`${Math.round((budget.currentMonth / budget.monthlyCap) * 100)}% of budget`}
        icon={<Calendar className="h-4 w-4" />}
      />
      <MetricCard
        label="Projected Month-End"
        value={`$${budget.projectedMonth}`}
        trend={budgetPct <= 100 ? "Within budget" : "Over budget"}
        trendUp={budgetPct <= 100}
        icon={<Target className="h-4 w-4" />}
      />
    </div>
  );
}
