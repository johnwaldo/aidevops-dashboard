import { useApiData } from "@/hooks/useApiData";
import { GaugeRing } from "@/components/shared/GaugeRing";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

interface LocalData {
  hostname: string;
  chip: string;
  uptime: string;
  cpu: { combined: number; user: number; sys: number; idle: number };
  memory: { used: number; total: number; pct: number; pressure: string };
  disk: { used: number; total: number; pct: number };
  gpu: { utilization: number | null; metalActive: boolean };
  status: string;
}

export function LocalMachinePanel() {
  const { data: local, loading, error, refresh } = useApiData<LocalData>("health/local", 15);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {local && (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#e4e4e7]">{local.hostname}</h3>
              <p className="text-[10px] font-mono text-[#71717a]">{local.chip}</p>
            </div>
            <StatusBadge status={local.status} label={local.uptime} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <GaugeRing value={local.cpu.combined} max={100} label="CPU" size={52} />
            <GaugeRing value={local.memory.pct} max={100} label="RAM" size={52} />
            <GaugeRing value={local.disk.pct} max={100} label="Disk" size={52} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded bg-[#0a0a0f] p-2">
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Memory</p>
              <p className="text-xs font-mono text-[#e4e4e7]">{local.memory.used}/{local.memory.total} GB</p>
              <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400 mt-1 px-1 py-0">
                {local.memory.pressure}
              </Badge>
            </div>
            <div className="rounded bg-[#0a0a0f] p-2">
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">GPU</p>
              <p className="text-xs font-mono text-[#e4e4e7]">
                {local.gpu.utilization != null ? `${local.gpu.utilization}% util` : "N/A"}
              </p>
              <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 mt-1 px-1 py-0">
                Metal {local.gpu.metalActive ? "Active" : "Idle"}
              </Badge>
            </div>
          </div>

          <div className="rounded bg-[#0a0a0f] p-2">
            <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-1">CPU Breakdown</p>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-[#e4e4e7]">User: {local.cpu.user}%</span>
              <span className="text-[#e4e4e7]">Sys: {local.cpu.sys}%</span>
              <span className="text-[#71717a]">Idle: {local.cpu.idle}%</span>
            </div>
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
