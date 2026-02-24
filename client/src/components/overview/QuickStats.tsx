import { GitCommitHorizontal, Users, GitPullRequest, CircleDot } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export function QuickStats() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="Commits Today"
        value="14"
        sparkData={[8, 12, 6, 14, 9, 11, 14]}
        icon={<GitCommitHorizontal className="h-4 w-4" />}
      />
      <MetricCard
        label="Active Sessions"
        value="2"
        trend="@code, @seo"
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        label="Open PRs"
        value="3"
        trend="across 2 repos"
        icon={<GitPullRequest className="h-4 w-4" />}
      />
      <MetricCard
        label="Open Issues"
        value="8"
        trend="across 4 repos"
        icon={<CircleDot className="h-4 w-4" />}
      />
    </div>
  );
}
