import { useApiData } from "@/hooks/useApiData";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

interface UptimeEntry {
  name: string;
  url: string;
  status: string;
  uptime7d: number | null;
  uptime30d: number | null;
  responseTime: number | null;
  responseTime7dAvg: number | null;
  lastCheckAt: string | null;
}

export function UptimeMonitors() {
  const { data: monitors, loading, error, refresh } = useApiData<UptimeEntry[]>("uptime", 60);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!monitors || monitors.length === 0 ? (
        <EmptyState message="No uptime monitors configured" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Uptime Monitors</h3>
          <div className="space-y-3">
            {monitors.map((monitor) => (
              <div key={monitor.name} className="flex items-center gap-3">
                <StatusBadge status={monitor.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-[#e4e4e7] truncate">{monitor.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {monitor.uptime7d != null && (
                      <span className={`text-[10px] font-mono ${monitor.uptime7d >= 99.9 ? "text-emerald-400" : monitor.uptime7d >= 99 ? "text-amber-400" : "text-rose-400"}`}>
                        {monitor.uptime7d}% 7d
                      </span>
                    )}
                    {monitor.uptime30d != null && (
                      <span className="text-[10px] font-mono text-[#71717a]">{monitor.uptime30d}% 30d</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {monitor.responseTime != null && (
                    <span className="text-xs font-mono text-[#e4e4e7] block">{monitor.responseTime}ms</span>
                  )}
                  {monitor.responseTime7dAvg != null && (
                    <span className="text-[10px] font-mono text-[#71717a] block">avg {monitor.responseTime7dAvg}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
