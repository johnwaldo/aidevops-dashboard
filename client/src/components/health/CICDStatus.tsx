import { useApiData } from "@/hooks/useApiData";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";
import { CheckCircle, XCircle, Clock, Activity } from "lucide-react";

interface CIData {
  repos: {
    repo: string;
    runs: {
      id: number;
      name: string;
      branch: string;
      status: string;
      conclusion: string | null;
      startedAt: string;
      durationSec: number | null;
      url: string;
      actor: string;
    }[];
    successRate: number;
    avgDurationSec: number;
    lastRun: {
      name: string;
      status: string;
      conclusion: string | null;
      startedAt: string;
      durationSec: number | null;
      url: string;
    } | null;
  }[];
  running: { repo: string; name: string; url: string }[];
  summary: {
    totalRuns: number;
    successRate: number;
    avgDurationSec: number;
    failureCount: number;
  };
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${min}m ${s}s` : `${min}m`;
}

function conclusionIcon(conclusion: string | null, status: string) {
  if (status === "in_progress" || status === "queued") return <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />;
  if (conclusion === "success") return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
  if (conclusion === "failure") return <XCircle className="h-3.5 w-3.5 text-rose-400" />;
  return <Activity className="h-3.5 w-3.5 text-[#71717a]" />;
}

export function CICDStatus() {
  const { data: ci, loading, error, refresh } = useApiData<CIData>("ci", 120);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!ci || ci.repos.length === 0 ? (
        <EmptyState message="No CI/CD pipelines configured" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">CI/CD Pipelines</h3>
            <div className="flex items-center gap-3 text-[10px] font-mono text-[#71717a]">
              <span className="text-emerald-400">{ci.summary.successRate}% pass</span>
              <span>{ci.summary.totalRuns} runs</span>
              {ci.summary.avgDurationSec > 0 && <span>avg {formatDuration(ci.summary.avgDurationSec)}</span>}
            </div>
          </div>

          {/* Running workflows */}
          {ci.running.length > 0 && (
            <div className="mb-3 space-y-1">
              {ci.running.map((r) => (
                <a key={`${r.repo}-${r.name}`} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <span className="font-mono">{r.repo}/{r.name}</span>
                  <span className="text-[10px] text-amber-400/60 ml-auto">running</span>
                </a>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {ci.repos.map((repo) => (
              <div key={repo.repo} className="rounded bg-[#0a0a0f] px-3 py-2">
                <div className="flex items-center gap-3 mb-1.5">
                  {repo.lastRun && conclusionIcon(repo.lastRun.conclusion, repo.lastRun.status)}
                  <span className="text-xs font-mono text-[#e4e4e7] flex-1">{repo.repo}</span>
                  <span className={`text-[10px] font-mono ${repo.successRate >= 80 ? "text-emerald-400" : repo.successRate >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                    {repo.successRate}%
                  </span>
                  {repo.avgDurationSec > 0 && (
                    <span className="text-[10px] font-mono text-[#71717a]">{formatDuration(repo.avgDurationSec)}</span>
                  )}
                </div>
                {/* Last 5 runs as dots */}
                <div className="flex items-center gap-1 ml-6">
                  {repo.runs.slice(0, 5).map((run) => (
                    <a key={run.id} href={run.url} target="_blank" rel="noopener noreferrer" title={`${run.name} (${run.conclusion ?? run.status})`}>
                      <div className={`h-2 w-2 rounded-full ${
                        run.conclusion === "success" ? "bg-emerald-500" :
                        run.conclusion === "failure" ? "bg-rose-500" :
                        run.status === "in_progress" ? "bg-amber-500 animate-pulse" :
                        "bg-[#71717a]"
                      }`} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
