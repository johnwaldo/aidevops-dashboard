import { agentsMock } from "@/lib/mock-data";
import { AgentCard } from "./AgentCard";

export function AgentRoster() {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Agent Roster</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agentsMock.primary.map((agent) => (
          <AgentCard key={agent.name} {...agent} />
        ))}
      </div>
    </div>
  );
}
