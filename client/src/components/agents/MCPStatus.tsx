import { agentsMock } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MCPStatus() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">MCP Servers</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e2e]">
              <th className="text-left py-2 px-2 font-medium text-[#71717a]">Server</th>
              <th className="text-left py-2 px-2 font-medium text-[#71717a]">Status</th>
              <th className="text-left py-2 px-2 font-medium text-[#71717a]">Loading</th>
              <th className="text-right py-2 px-2 font-medium text-[#71717a]">Last Ping</th>
            </tr>
          </thead>
          <tbody>
            {agentsMock.mcpServers.map((server) => (
              <tr key={server.name} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20">
                <td className="py-2 px-2 font-mono text-[#e4e4e7]">{server.name}</td>
                <td className="py-2 px-2">
                  <StatusBadge status={server.status} label={server.status} />
                </td>
                <td className="py-2 px-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      server.loading === "eager"
                        ? "border-cyan-500/20 text-cyan-400"
                        : "border-[#1e1e2e] text-[#71717a]"
                    )}
                  >
                    {server.loading}
                  </Badge>
                </td>
                <td className="py-2 px-2 font-mono text-[#71717a] text-right">{server.lastPing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
