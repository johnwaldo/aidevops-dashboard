import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApiData } from "@/hooks/useApiData";

export function TopBar() {
  const { data: health } = useApiData<{ local: { status: string } | null; vps: { status: string } | null }>("health", 15);
  const { data: tokens } = useApiData<{ budget: { today: number; currentMonth: number } }>("tokens", 300);
  const { data: needs } = useApiData<unknown[]>("needs", 10);
  const { data: ollama } = useApiData<{ status: string; loaded: unknown[]; inference: { tokensPerSec: number | null } }>("ollama", 10);

  const localStatus = health?.local?.status ?? "unknown";
  const vpsStatus = health?.vps?.status ?? "unknown";
  const ollamaStatus = ollama?.status ?? "unknown";
  const loadedCount = ollama?.loaded?.length ?? 0;
  const tps = ollama?.inference?.tokensPerSec;
  const monthSpend = tokens?.budget?.currentMonth ?? 0;
  const needsCount = needs?.length ?? 0;

  return (
    <header className="h-12 shrink-0 border-b border-[#1e1e2e] bg-[#111118] px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={vpsStatus} label="VPS" />
          <StatusBadge status={localStatus} label="Local" />
        </div>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <span className="text-xs text-[#71717a] font-mono">
          Ollama: {ollamaStatus === "running" ? `${loadedCount} model${loadedCount !== 1 ? "s" : ""} loaded` : ollamaStatus}
          {tps ? ` \u00b7 ${tps} t/s` : ""}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a] font-mono">
            ${monthSpend.toFixed(0)} this month
          </span>
        </div>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-400">
            {needsCount}
          </span>
          <span className="text-xs text-[#71717a]">needs</span>
        </div>
      </div>
    </header>
  );
}
