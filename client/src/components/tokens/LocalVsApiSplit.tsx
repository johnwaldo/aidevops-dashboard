import { tokensMock } from "@/lib/mock-data";

export function LocalVsApiSplit() {
  const { localVsApi, byModel } = tokensMock;
  const localTokens = byModel.find((m) => m.model.includes("Ollama"))?.tokens ?? 0;
  const apiTokens = byModel.filter((m) => !m.model.includes("Ollama")).reduce((acc, m) => acc + m.tokens, 0);

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Local vs API</h3>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-4 rounded-full bg-[#1e1e2e] overflow-hidden flex">
          <div
            className="h-full bg-violet-500/60 transition-all"
            style={{ width: `${localVsApi.local}%` }}
          />
          <div
            className="h-full bg-cyan-500/60 transition-all"
            style={{ width: `${localVsApi.api}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-500/60" />
          <span className="text-[#e4e4e7]">Local (Ollama)</span>
          <span className="font-mono text-[#71717a]">{localVsApi.local}%</span>
          <span className="font-mono text-[#71717a]">{(localTokens / 1000000).toFixed(1)}M tokens</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/60" />
          <span className="text-[#e4e4e7]">API (Anthropic)</span>
          <span className="font-mono text-[#71717a]">{localVsApi.api}%</span>
          <span className="font-mono text-[#71717a]">{(apiTokens / 1000000).toFixed(1)}M tokens</span>
        </div>
      </div>
    </div>
  );
}
