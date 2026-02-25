import { BudgetDashboard } from "@/components/tokens/BudgetDashboard";
import { DailySpendChart } from "@/components/tokens/DailySpendChart";
import { ModelBreakdown } from "@/components/tokens/ModelBreakdown";
import { ModelPerformance } from "@/components/tokens/ModelPerformance";
import { LocalVsApiSplit } from "@/components/tokens/LocalVsApiSplit";
import { SessionCosts } from "@/components/tokens/SessionCosts";

export function TokensPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Tokens & Cost</h1>
        <p className="text-sm text-[#71717a] mt-1">Token usage, model performance, and cost analytics.</p>
      </div>

      <BudgetDashboard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DailySpendChart />
        <ModelBreakdown />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SessionCosts />
        <div className="space-y-4">
          <ModelPerformance />
          <LocalVsApiSplit />
        </div>
      </div>
    </div>
  );
}
