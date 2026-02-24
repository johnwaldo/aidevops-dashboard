import { useApiData } from "@/hooks/useApiData";
import { GaugeRing } from "@/components/shared/GaugeRing";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

export function SystemStatus() {
  const { data: health, loading, error, refresh } = useApiData<{
    local: { hostname: string; cpu: { combined: number }; memory: { pct: number }; disk: { pct: number } } | null;
    vps: { hostname: string; cpu: { current: number }; ram: { pct: number }; disk: { pct: number } } | null;
  }>("health", 15);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-4">Resource Usage</h3>
        <div className="grid grid-cols-2 gap-6">
          {health?.vps && (
            <div>
              <p className="text-[10px] font-mono text-cyan-400/70 mb-3 text-center">VPS &middot; {health.vps.hostname}</p>
              <div className="flex justify-center gap-4">
                <GaugeRing value={health.vps.cpu.current} max={100} label="CPU" />
                <GaugeRing value={health.vps.ram.pct} max={100} label="RAM" />
                <GaugeRing value={health.vps.disk.pct} max={100} label="Disk" />
              </div>
            </div>
          )}
          {health?.local && (
            <div className={health?.vps ? "" : "col-span-2"}>
              <p className="text-[10px] font-mono text-cyan-400/70 mb-3 text-center">Local &middot; {health.local.hostname}</p>
              <div className="flex justify-center gap-4">
                <GaugeRing value={health.local.cpu.combined} max={100} label="CPU" />
                <GaugeRing value={health.local.memory.pct} max={100} label="RAM" />
                <GaugeRing value={health.local.disk.pct} max={100} label="Disk" />
              </div>
            </div>
          )}
          {!health?.local && !health?.vps && (
            <p className="col-span-2 text-xs text-[#71717a] text-center py-4">No health data available</p>
          )}
        </div>
      </div>
    </LoadingPanel>
  );
}
