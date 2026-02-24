import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

interface TokensData {
  byModel: {
    model: string;
    tokens: number;
    cost: number;
    pct: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }[];
}

export function ModelPerformance() {
  const { data: tokens, loading, error, refresh } = useApiData<TokensData>("tokens", 60);

  if (!tokens) {
    return <LoadingPanel loading={loading} error={error} onRetry={refresh}><div /></LoadingPanel>;
  }

  if (tokens.byModel.length === 0) {
    return <EmptyState message="No model data available" />;
  }

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Model Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2 px-2 font-medium text-[#71717a]">Model</th>
                <th className="text-right py-2 px-2 font-medium text-[#71717a]">Requests</th>
                <th className="text-right py-2 px-2 font-medium text-[#71717a]">Input Tokens</th>
                <th className="text-right py-2 px-2 font-medium text-[#71717a]">Output Tokens</th>
                <th className="text-right py-2 px-2 font-medium text-[#71717a]">Total Tokens</th>
                <th className="text-right py-2 px-2 font-medium text-[#71717a]">Cost</th>
                <th className="text-right py-2 px-2 font-medium text-[#71717a]">Share</th>
              </tr>
            </thead>
            <tbody>
              {tokens.byModel.map((m) => (
                <tr key={m.model} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20">
                  <td className="py-2 px-2 font-mono text-[#e4e4e7]">{m.model}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.requests.toLocaleString()}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.inputTokens.toLocaleString()}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.outputTokens.toLocaleString()}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.tokens.toLocaleString()}</td>
                  <td className="py-2 px-2 font-mono text-cyan-400 text-right">${m.cost.toFixed(2)}</td>
                  <td className="py-2 px-2 font-mono text-[#71717a] text-right">{m.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LoadingPanel>
  );
}
