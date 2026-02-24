import { uptimeMock } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Sparkline } from "@/components/shared/Sparkline";

export function UptimeMonitors() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Uptime Monitors</h3>
      <div className="space-y-3">
        {uptimeMock.map((monitor) => (
          <div key={monitor.name} className="flex items-center gap-3">
            <StatusBadge status={monitor.status} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-mono text-[#e4e4e7] truncate">{monitor.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-mono text-emerald-400">{monitor.uptime7d}% 7d</span>
                <span className="text-[10px] font-mono text-[#71717a]">{monitor.uptime30d}% 30d</span>
              </div>
            </div>
            <Sparkline data={monitor.history} className="text-cyan-400/50" width={48} height={14} />
            <span className="text-xs font-mono text-[#71717a] w-14 text-right">{monitor.responseTime}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
