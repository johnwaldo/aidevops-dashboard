import { AgentRoster } from "@/components/agents/AgentRoster";
import { MCPStatus } from "@/components/agents/MCPStatus";
import { agentsMock } from "@/lib/mock-data";
import { ShieldCheck } from "lucide-react";

export function AgentsPage() {
  const { skillScans } = agentsMock;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Agents</h1>
        <p className="text-sm text-[#71717a] mt-1">AI agent roster, MCP servers, and skill security.</p>
      </div>

      <AgentRoster />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <MCPStatus />
        </div>
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Skill Security</h3>
          <div className="flex flex-col items-center gap-3 py-4">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <div className="text-center">
              <p className="text-2xl font-mono font-semibold text-[#e4e4e7]">{skillScans.totalSkills}</p>
              <p className="text-xs text-[#71717a]">Total skills</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-emerald-400">{skillScans.blocked} blocked</span>
              <span className="text-amber-400">{skillScans.warnings} warnings</span>
            </div>
            <p className="text-[10px] text-[#71717a]">
              Last scan: {new Date(skillScans.lastScan).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
