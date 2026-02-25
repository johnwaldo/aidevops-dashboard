import { GitCommitHorizontal, GitPullRequest, CircleDot, Bot } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { useApiData } from "@/hooks/useApiData";

export function QuickStats() {
  const { data: projects } = useApiData<{ prs: number; issues: number }[]>("projects", 300);
  const { data: agents } = useApiData<{ totalSubagents: number }>("agents", 300);

  const totalPRs = (projects ?? []).reduce((sum, p) => sum + p.prs, 0);
  const totalIssues = (projects ?? []).reduce((sum, p) => sum + p.issues, 0);
  const repoCount = projects?.length ?? 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard label="Repositories" value={String(repoCount)} icon={<GitCommitHorizontal className="h-4 w-4" />} />
      <MetricCard label="Agents" value={String(agents?.totalSubagents ?? 0)} trend="subagents" icon={<Bot className="h-4 w-4" />} />
      <MetricCard label="Open PRs" value={String(totalPRs)} trend={`across ${repoCount} repos`} icon={<GitPullRequest className="h-4 w-4" />} />
      <MetricCard label="Open Issues" value={String(totalIssues)} trend={`across ${repoCount} repos`} icon={<CircleDot className="h-4 w-4" />} />
    </div>
  );
}
