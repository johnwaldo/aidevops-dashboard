import { QuickStats } from "@/components/overview/QuickStats";
import { NeedsBadge } from "@/components/overview/NeedsBadge";
import { RecentActivity } from "@/components/overview/RecentActivity";
import { SystemStatus } from "@/components/overview/SystemStatus";
import { TokenBudgetBar } from "@/components/overview/TokenBudgetBar";
import { ModelHealth } from "@/components/overview/ModelHealth";

export function OverviewPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Row 1: Quick Stats */}
      <QuickStats />

      {/* Row 2: Needs + Activity (60/40) */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <NeedsBadge />
        </div>
        <div className="col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Row 3: Resources + Token Spend + Model Health */}
      <div className="grid grid-cols-3 gap-4">
        <SystemStatus />
        <TokenBudgetBar />
        <ModelHealth />
      </div>
    </div>
  );
}
