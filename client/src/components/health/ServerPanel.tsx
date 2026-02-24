import { systemMock } from "@/lib/mock-data";
import { GaugeRing } from "@/components/shared/GaugeRing";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Sparkline } from "@/components/shared/Sparkline";

export function ServerPanel() {
  const { vps } = systemMock;

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#e4e4e7]">{vps.hostname}</h3>
          <p className="text-[10px] font-mono text-[#71717a]">{vps.provider} &middot; {vps.os} &middot; {vps.ip}</p>
        </div>
        <StatusBadge status={vps.status} label={vps.uptime} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col items-center gap-1">
          <GaugeRing value={vps.cpu.current} max={100} label="CPU" size={52} />
          <Sparkline data={vps.cpu.history} className="text-cyan-400/50" width={48} height={14} />
        </div>
        <div className="flex flex-col items-center">
          <GaugeRing value={vps.ram.pct} max={100} label="RAM" size={52} />
          <span className="text-[10px] font-mono text-[#71717a] mt-1">{vps.ram.used}/{vps.ram.total} GB</span>
        </div>
        <div className="flex flex-col items-center">
          <GaugeRing value={vps.disk.pct} max={100} label="Disk" size={52} />
          <span className="text-[10px] font-mono text-[#71717a] mt-1">{vps.disk.used}/{vps.disk.total} GB</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-lg font-mono font-semibold text-[#e4e4e7]">{vps.sshLatency}ms</span>
          <span className="text-[10px] text-[#71717a] uppercase tracking-wider">SSH</span>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-2">Services</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {vps.services.map((svc) => (
            <div key={svc.name} className="flex items-center gap-2 text-xs">
              <StatusBadge status={svc.status} />
              <span className="font-mono text-[#e4e4e7]">{svc.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
