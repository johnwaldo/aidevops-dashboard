import { systemMock } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkPanel() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Tailscale Network</h3>
        <StatusBadge status={systemMock.tailscale.status} label="Connected" />
      </div>
      <div className="space-y-2">
        {systemMock.tailscale.nodes.map((node) => (
          <div key={node.name} className="flex items-center gap-3 rounded bg-[#0a0a0f] px-3 py-2">
            {node.online ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            )}
            <span className="text-xs font-mono text-[#e4e4e7] flex-1">{node.name}</span>
            <span className="text-[10px] font-mono text-[#71717a]">{node.ip}</span>
            <span className="text-[10px] font-mono text-[#71717a] w-16 text-right">{node.lastSeen}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
