import { config } from "../config";

export interface OllamaStatus {
  status: "running" | "stopped" | "error";
  loaded: { name: string; size: string; quantization: string; vram: number; expiresAt: string }[];
  available: string[];
  inference: { queue: number; avgLatency: number | null; tokensPerSec: number | null };
  memoryTotal: number | null;
  memoryUsed: number | null;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export async function collectOllamaStatus(): Promise<OllamaStatus> {
  const base = config.ollamaHost;

  try {
    // Fetch available models
    const tagsRes = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!tagsRes.ok) throw new Error(`Tags API returned ${tagsRes.status}`);
    const tagsData = await tagsRes.json() as { models: { name: string; size: number; details?: { quantization_level?: string } }[] };

    // Fetch running models
    let loaded: OllamaStatus["loaded"] = [];
    try {
      const psRes = await fetch(`${base}/api/ps`, { signal: AbortSignal.timeout(3000) });
      if (psRes.ok) {
        const psData = await psRes.json() as { models: { name: string; size: number; size_vram: number; details?: { quantization_level?: string }; expires_at?: string }[] };
        loaded = (psData.models ?? []).map((m) => ({
          name: m.name,
          size: formatSize(m.size),
          quantization: m.details?.quantization_level ?? "unknown",
          vram: Math.round((m.size_vram / (1024 * 1024 * 1024)) * 10) / 10,
          expiresAt: m.expires_at ?? "",
        }));
      }
    } catch {
      // /api/ps may not be available in older versions
    }

    const available = (tagsData.models ?? []).map((m) => m.name);

    // Calculate total VRAM used by loaded models
    const memoryUsed = loaded.reduce((sum, m) => sum + m.vram, 0);

    return {
      status: "running",
      loaded,
      available,
      inference: { queue: 0, avgLatency: null, tokensPerSec: null },
      memoryTotal: null, // Would need system info
      memoryUsed: memoryUsed > 0 ? memoryUsed : null,
    };
  } catch (err) {
    const isConnectionRefused = String(err).includes("ECONNREFUSED") || String(err).includes("fetch failed") || String(err).includes("timeout");

    return {
      status: isConnectionRefused ? "stopped" : "error",
      loaded: [],
      available: [],
      inference: { queue: 0, avgLatency: null, tokensPerSec: null },
      memoryTotal: null,
      memoryUsed: null,
    };
  }
}
