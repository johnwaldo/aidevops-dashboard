import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { AgentDispatch } from "./AgentDispatch";

interface AgentCardProps {
  name: string;
  desc: string;
  status: "active" | "idle";
  lastUsed: string;
  subagents: number;
  mcps: string[];
}

export function AgentCard({ name, desc, status, lastUsed, subagents, mcps }: AgentCardProps) {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 transition-all hover:border-[#2e2e3e] group">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-mono font-semibold text-[#e4e4e7] group-hover:text-cyan-300 transition-colors">
            {name}
          </h3>
          <p className="text-xs text-[#71717a] mt-0.5">{desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <AgentDispatch agentName={name} />
          <StatusBadge status={status} label={status} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono text-[#71717a] mb-2">
        <span>Last: {lastUsed}</span>
        <span>{subagents} subagents</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {mcps.map((mcp) => (
          <Badge key={mcp} variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
            {mcp}
          </Badge>
        ))}
      </div>
    </div>
  );
}
