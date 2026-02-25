import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

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

export function LocalVsApiSplit() {
  const { data: tokens, loading, error, refresh } = useApiData<TokensData>("tokens", 60);

  if (!tokens) {
    return <LoadingPanel loading={loading} error={error} onRetry={refresh}><div /></LoadingPanel>;
  }

  const localTokens = tokens.byModel
    .filter((m) => m.model.toLowerCase().includes("ollama") || m.model.toLowerCase().includes("local"))
    .reduce((acc, m) => acc + m.tokens, 0);
  const apiTokens = tokens.byModel
    .filter((m) => !m.model.toLowerCase().includes("ollama") && !m.model.toLowerCase().includes("local"))
    .reduce((acc, m) => acc + m.tokens, 0);
  const totalTokens = localTokens + apiTokens;
  const localPct = totalTokens > 0 ? Math.round((localTokens / totalTokens) * 100) : 0;
  const apiPct = totalTokens > 0 ? 100 - localPct : 0;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Local vs API</h3>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-4 rounded-full bg-[#1e1e2e] overflow-hidden flex">
            <div
              className="h-full bg-violet-500/60 transition-all"
              style={{ width: `${localPct}%` }}
            />
            <div
              className="h-full bg-cyan-500/60 transition-all"
              style={{ width: `${apiPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/60" />
            <span className="text-[#e4e4e7]">Local (Ollama)</span>
            <span className="font-mono text-[#71717a]">{localPct}%</span>
            <span className="font-mono text-[#71717a]">{(localTokens / 1000000).toFixed(1)}M tokens</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/60" />
            <span className="text-[#e4e4e7]">API (Anthropic)</span>
            <span className="font-mono text-[#71717a]">{apiPct}%</span>
            <span className="font-mono text-[#71717a]">{(apiTokens / 1000000).toFixed(1)}M tokens</span>
          </div>
        </div>
      </div>
    </LoadingPanel>
  );
}
