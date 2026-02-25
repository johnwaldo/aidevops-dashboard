import { QuickStats } from "@/components/overview/QuickStats";
import { NeedsBadge } from "@/components/overview/NeedsBadge";
import { RecentActivity } from "@/components/overview/RecentActivity";
import { SystemStatus } from "@/components/overview/SystemStatus";
import { TokenBudgetBar } from "@/components/overview/TokenBudgetBar";
import { ModelHealth } from "@/components/overview/ModelHealth";

export function OverviewPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Row 1: Quick Stats */}
      <QuickStats />

      {/* Row 2: Needs + Activity (60/40 on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <NeedsBadge />
        </div>
        <div className="md:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Row 3: Resources + Token Spend + Model Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SystemStatus />
        <TokenBudgetBar />
        <ModelHealth />
      </div>
    </div>
  );
}
