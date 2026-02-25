import { useApiData } from "@/hooks/useApiData";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

interface OllamaData {
  status: string;
  loaded: { name: string; size: string; quantization: string; vram: number; expiresAt: string }[];
  available: string[];
  inference: { queue: number; avgLatency: number; tokensPerSec: number };
  memoryTotal: number | null;
  memoryUsed: number | null;
}

export function OllamaPanel() {
  const { data: ollama, loading, error, refresh } = useApiData<OllamaData>("ollama", 15);

  const memPct =
    ollama?.memoryTotal && ollama?.memoryUsed
      ? Math.round((ollama.memoryUsed / ollama.memoryTotal) * 100)
      : null;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {ollama && (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e4e4e7]">Ollama</h3>
            <StatusBadge status={ollama.status} label={ollama.status} />
          </div>

          <div>
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-2">Loaded Models</h4>
            <div className="space-y-2">
              {ollama.loaded.map((model) => (
                <div key={model.name} className="rounded bg-[#0a0a0f] p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#e4e4e7]">{model.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400/70">{model.vram} GB VRAM</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-[#71717a]">{model.size}</span>
                    <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1 py-0">{model.quantization}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-2">Inference</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-mono font-semibold text-[#e4e4e7]">{ollama.inference.queue}</p>
                <p className="text-[10px] text-[#71717a]">Queue</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold text-[#e4e4e7]">{ollama.inference.avgLatency}ms</p>
                <p className="text-[10px] text-[#71717a]">Avg Latency</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold text-cyan-400">{ollama.inference.tokensPerSec} t/s</p>
                <p className="text-[10px] text-[#71717a]">Throughput</p>
              </div>
            </div>
          </div>

          {memPct != null && ollama.memoryUsed != null && ollama.memoryTotal != null && (
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-2">Memory</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${memPct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-[#71717a]">{ollama.memoryUsed}/{ollama.memoryTotal} GB</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-2">Available Models</h4>
            <div className="flex flex-wrap gap-1.5">
              {ollama.available.map((name) => (
                <Badge key={name} variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a]">{name}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
