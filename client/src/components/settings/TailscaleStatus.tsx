import { Wifi } from "lucide-react";

export function TailscaleStatus() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Tailscale</h3>
        <span className="text-[10px] font-mono text-[#71717a] bg-[#1e1e2e] px-2 py-0.5 rounded">Not monitored</span>
      </div>
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Wifi className="h-6 w-6 text-[#71717a]/40" />
        <p className="text-xs text-[#71717a]">Tailscale status not available via API.</p>
      </div>
    </div>
  );
}
