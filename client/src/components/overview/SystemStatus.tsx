import { systemMock } from "@/lib/mock-data";
import { GaugeRing } from "@/components/shared/GaugeRing";

export function SystemStatus() {
  const { vps, local } = systemMock;

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-4">Resource Usage</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-mono text-cyan-400/70 mb-3 text-center">VPS &middot; {vps.hostname}</p>
          <div className="flex justify-center gap-4">
            <GaugeRing value={vps.cpu.current} max={100} label="CPU" />
            <GaugeRing value={vps.ram.pct} max={100} label="RAM" />
            <GaugeRing value={vps.disk.pct} max={100} label="Disk" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-mono text-cyan-400/70 mb-3 text-center">Local &middot; {local.hostname}</p>
          <div className="flex justify-center gap-4">
            <GaugeRing value={local.cpu.combined} max={100} label="CPU" />
            <GaugeRing value={local.memory.pct} max={100} label="RAM" />
            <GaugeRing value={local.disk.pct} max={100} label="Disk" />
          </div>
        </div>
      </div>
    </div>
  );
}
