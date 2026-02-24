import { useApiData } from "@/hooks/useApiData";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

interface Project {
  name: string;
  ci: string;
  lastCommit: { sha: string; message: string; author: string; time: string };
}

export function CICDStatus() {
  const { data: projects, loading, error, refresh } = useApiData<Project[]>("projects", 60);

  const withCI = (projects ?? []).filter((p) => p.ci !== "none");

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {withCI.length === 0 ? (
        <EmptyState message="No CI/CD pipelines configured" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">CI/CD Pipelines</h3>
          <div className="space-y-2">
            {withCI.map((project) => (
              <div key={project.name} className="flex items-center gap-3 rounded bg-[#0a0a0f] px-3 py-2">
                <StatusBadge status={project.ci} />
                <span className="text-xs font-mono text-[#e4e4e7] flex-1">{project.name}</span>
                <span className="text-[10px] font-mono text-[#71717a]">{project.lastCommit.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
