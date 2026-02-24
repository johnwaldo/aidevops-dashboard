import { systemMock } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Wifi, WifiOff } from "lucide-react";

export function TailscaleStatus() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Tailscale</h3>
        <StatusBadge status={systemMock.tailscale.status} label="Connected" />
      </div>
      <div className="space-y-1.5">
        {systemMock.tailscale.nodes.map((node) => (
          <div key={node.name} className="flex items-center gap-2 text-xs">
            {node.online ? (
              <Wifi className="h-3 w-3 text-emerald-400" />
            ) : (
              <WifiOff className="h-3 w-3 text-zinc-500" />
            )}
            <span className="font-mono text-[#e4e4e7] flex-1">{node.name}</span>
            <span className="font-mono text-[#71717a]">{node.ip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
