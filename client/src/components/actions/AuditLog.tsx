import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel } from "@/components/shared/LoadingPanel";
import { Check, X, Clock } from "lucide-react";

interface AuditEntry {
  ts: string;
  action: string;
  target: string;
  params: Record<string, unknown>;
  user: string;
  result: "success" | "failure";
  error?: string;
  durationMs: number;
}

interface AuditData {
  entries: AuditEntry[];
  total: number;
  sizeBytes: number;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    tasks: "text-cyan-400 bg-cyan-400/10",
    github: "text-violet-400 bg-violet-400/10",
    agents: "text-emerald-400 bg-emerald-400/10",
    settings: "text-amber-400 bg-amber-400/10",
    needs: "text-rose-400 bg-rose-400/10",
  };

  const prefix = action.split(".")[0];
  const color = colors[prefix] ?? "text-[#71717a] bg-[#1e1e2e]";

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono ${color}`}>
      {action}
    </span>
  );
}

export function AuditLog() {
  const { data, loading, error, refresh } = useApiData<AuditData>("audit?limit=30", 60);

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Audit Log</h3>
          {data && (
            <p className="text-[10px] text-[#3f3f46] mt-0.5">
              {data.total} total entries ({(data.sizeBytes / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          className="text-[10px] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
        >
          Refresh
        </button>
      </div>

      <LoadingPanel loading={loading} error={error} onRetry={refresh}>
        <div className="divide-y divide-[#1e1e2e]">
          {data?.entries.length === 0 && (
            <p className="text-xs text-[#71717a] p-4 text-center">No audit entries yet</p>
          )}
          {data?.entries.map((entry, i) => (
            <div key={i} className="px-4 py-2.5 hover:bg-[#0a0a0f]/50 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.result === "success" ? (
                  <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                ) : (
                  <X className="h-3 w-3 text-rose-400 shrink-0" />
                )}
                <ActionBadge action={entry.action} />
                <span className="text-xs text-[#e4e4e7] font-mono truncate">{entry.target}</span>
                <span className="text-[10px] text-[#3f3f46] ml-auto shrink-0 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {entry.durationMs}ms
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#3f3f46]">
                <span>{formatTime(entry.ts)}</span>
                <span>by {entry.user}</span>
                {entry.error && (
                  <span className="text-rose-400 truncate">{entry.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </LoadingPanel>
    </div>
  );
}
