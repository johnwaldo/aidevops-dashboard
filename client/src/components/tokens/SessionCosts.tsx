import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";
import { Badge } from "@/components/ui/badge";

interface SessionCost {
  sessionFile: string;
  project: string;
  cost: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  firstMessage: string;
  lastMessage: string;
  models: string[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SessionCosts() {
  const { data: sessions, loading, error, refresh } = useApiData<SessionCost[]>("tokens/sessions", 300);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!sessions || sessions.length === 0 ? (
        <EmptyState message="No session data available" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Session Costs (7 days)</h3>
            <span className="text-[10px] font-mono text-[#71717a]">{sessions.length} sessions</span>
          </div>
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
            {sessions.map((session) => (
              <div key={session.sessionFile} className="flex items-center gap-3 rounded bg-[#0a0a0f] px-3 py-2 group hover:bg-[#0f0f1a] transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#e4e4e7] truncate">{session.project}</span>
                    {session.models.map((m) => (
                      <Badge key={m} variant="outline" className="text-[9px] border-[#1e1e2e] text-[#71717a] px-1 py-0 h-4">
                        {m}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-mono text-[#71717a]">{session.requests} reqs</span>
                    <span className="text-[10px] font-mono text-[#71717a]">{formatTokens(session.inputTokens)} in / {formatTokens(session.outputTokens)} out</span>
                    <span className="text-[10px] font-mono text-[#71717a]">{timeAgo(session.lastMessage)}</span>
                  </div>
                </div>
                <span className={`text-sm font-mono font-medium shrink-0 ${session.cost > 10 ? "text-rose-400" : session.cost > 5 ? "text-amber-400" : "text-emerald-400"}`}>
                  ${session.cost.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
