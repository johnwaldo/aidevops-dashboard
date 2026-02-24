import { AgentRoster } from "@/components/agents/AgentRoster";
import { MCPStatus } from "@/components/agents/MCPStatus";
import { useApiData } from "@/hooks/useApiData";
import { ShieldCheck } from "lucide-react";

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

export function AgentsPage() {
  const { data: agentsData } = useApiData<AgentsData>("agents");

  const agentCount = agentsData?.agents.length ?? 0;
  const totalSubagents = agentsData?.totalSubagents ?? 0;
  const mcpCount = new Set((agentsData?.agents ?? []).flatMap((a) => a.mcps)).size;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Agents</h1>
        <p className="text-sm text-[#71717a] mt-1">AI agent roster, MCP servers, and configuration.</p>
      </div>

      <AgentRoster />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <MCPStatus />
        </div>
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Agent Summary</h3>
          <div className="flex flex-col items-center gap-3 py-4">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold text-[#e4e4e7]">{agentCount}</p>
              <p className="text-xs text-[#71717a]">Total agents</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-cyan-400">{totalSubagents} subagents</span>
              <span className="text-violet-400">{mcpCount} MCP servers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
