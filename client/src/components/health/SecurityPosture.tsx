import { ShieldCheck, Key, Bot } from "lucide-react";
import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

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

interface Project {
  name: string;
}

export function SecurityPosture() {
  const { data: agentsData, loading: agentsLoading, error: agentsError, refresh: agentsRefresh } = useApiData<AgentsData>("agents");
  const { data: projects, loading: projectsLoading, error: projectsError, refresh: projectsRefresh } = useApiData<Project[]>("projects");

  const loading = agentsLoading || projectsLoading;
  const error = agentsError || projectsError;
  const refresh = () => { agentsRefresh(); projectsRefresh(); };

  const agentCount = agentsData?.agents.length ?? 0;
  const subagentCount = agentsData?.totalSubagents ?? 0;
  const projectCount = projects?.length ?? 0;
  const mcpCount = new Set((agentsData?.agents ?? []).flatMap((a) => a.mcps)).size;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Security Posture</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
            <Key className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-mono font-semibold text-[#e4e4e7]">gopass</span>
            <span className="text-[10px] text-emerald-400">Active</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-mono font-semibold text-[#e4e4e7]">{projectCount}</span>
            <span className="text-[10px] text-[#71717a]">Projects</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
            <Bot className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-mono font-semibold text-[#e4e4e7]">{agentCount}</span>
            <span className="text-[10px] text-[#71717a]">Agents ({subagentCount} sub)</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded bg-[#0a0a0f] p-3">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-mono font-semibold text-[#e4e4e7]">{mcpCount}</span>
            <span className="text-[10px] text-[#71717a]">MCP servers</span>
          </div>
        </div>
      </div>
    </LoadingPanel>
  );
}
