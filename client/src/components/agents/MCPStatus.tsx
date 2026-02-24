import { useApiData } from "@/hooks/useApiData";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

interface Agent {
  name: string;
  description: string;
  subagents: string[];
  mcps: string[];
}

interface AgentsData {
  agents: Agent[];
  totalSubagents: number;
}

export function MCPStatus() {
  const { data: agentsData, loading, error, refresh } = useApiData<AgentsData>("agents");

  const agents = agentsData?.agents ?? [];

  // Collect all unique MCP servers and which agents use them
  const mcpMap = new Map<string, string[]>();
  for (const agent of agents) {
    for (const mcp of agent.mcps) {
      if (!mcpMap.has(mcp)) mcpMap.set(mcp, []);
      mcpMap.get(mcp)!.push(agent.name);
    }
  }
  const mcpEntries = Array.from(mcpMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {mcpEntries.length === 0 ? (
        <EmptyState message="No MCP servers found" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">MCP Servers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e2e]">
                  <th className="text-left py-2 px-2 font-medium text-[#71717a]">Server</th>
                  <th className="text-left py-2 px-2 font-medium text-[#71717a]">Used By</th>
                  <th className="text-right py-2 px-2 font-medium text-[#71717a]">Agents</th>
                </tr>
              </thead>
              <tbody>
                {mcpEntries.map(([name, agentNames]) => (
                  <tr key={name} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20">
                    <td className="py-2 px-2 font-mono text-[#e4e4e7]">{name}</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {agentNames.map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono text-[#71717a] text-right">{agentNames.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
