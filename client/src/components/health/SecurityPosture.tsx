import { ShieldCheck, ShieldAlert, Key, ScanSearch } from "lucide-react";
import { agentsMock, projectsMock } from "@/lib/mock-data";

export function SecurityPosture() {
  const totalVulns = projectsMock.reduce(
    (acc, p) => acc + p.vulns.critical + p.vulns.high + p.vulns.medium,
    0
  );
  const highVulns = projectsMock.reduce((acc, p) => acc + p.vulns.critical + p.vulns.high, 0);

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Security Posture</h3>
      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
          <Key className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-mono font-semibold text-[#e4e4e7]">gopass</span>
          <span className="text-[10px] text-emerald-400">Active</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
          {highVulns > 0 ? (
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
          <span className="text-sm font-mono font-semibold text-[#e4e4e7]">{totalVulns}</span>
          <span className="text-[10px] text-[#71717a]">Vulns ({highVulns} high)</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
          <ScanSearch className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-mono font-semibold text-[#e4e4e7]">{agentsMock.skillScans.totalSkills}</span>
          <span className="text-[10px] text-[#71717a]">Skills scanned</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-mono font-semibold text-[#e4e4e7]">{agentsMock.skillScans.warnings}</span>
          <span className="text-[10px] text-[#71717a]">Warnings</span>
        </div>
      </div>
    </div>
  );
}
