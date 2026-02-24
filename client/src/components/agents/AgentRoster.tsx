import { useApiData } from "@/hooks/useApiData";
import { AgentCard } from "./AgentCard";
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

export function AgentRoster() {
  const { data: agentsData, loading, error, refresh } = useApiData<AgentsData>("agents");

  const agents = agentsData?.agents ?? [];

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {agents.length === 0 ? (
        <EmptyState message="No agents found" />
      ) : (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Agent Roster</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.name}
                name={agent.name}
                desc={agent.description}
                status="active"
                lastUsed="—"
                subagents={agent.subagents.length}
                mcps={agent.mcps}
              />
            ))}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
