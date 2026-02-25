import { StatusBadge } from "@/components/shared/StatusBadge";
import { useApiData } from "@/hooks/useApiData";
import { ArrowUpCircle, Wifi, WifiOff, Loader2 } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/useWebSocket";
import type { Page } from "@/App";

interface TopBarProps {
  wsStatus?: ConnectionStatus;
  onNavigate?: (page: Page) => void;
}

interface UpdateStatus {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  commitsBehind: number;
}

export function TopBar({ wsStatus = "connected", onNavigate }: TopBarProps) {
  const { data: health } = useApiData<{ local: { status: string } | null; vps: { status: string } | null }>("health", 15);
  const { data: tokens } = useApiData<{ budget: { today: number; currentMonth: number } }>("tokens", 300);
  const { data: needs } = useApiData<unknown[]>("needs", 10);
  const { data: ollama } = useApiData<{ status: string; loaded: unknown[]; inference: { tokensPerSec: number | null } }>("ollama", 10);
  const { data: status } = useApiData<{ version: { installed: string; latest: string; updateAvailable: boolean } }>("status", 600);
  const { data: dashUpdate } = useApiData<UpdateStatus>("update/check", 600);

  const localStatus = health?.local?.status ?? "unknown";
  const vpsStatus = health?.vps?.status ?? "unknown";
  const ollamaStatus = ollama?.status ?? "unknown";
  const loadedCount = ollama?.loaded?.length ?? 0;
  const tps = ollama?.inference?.tokensPerSec;
  const monthSpend = tokens?.budget?.currentMonth ?? 0;
  const needsCount = needs?.length ?? 0;
  // Show update if either framework or dashboard has an update
  const frameworkUpdate = status?.version?.updateAvailable ?? false;
  const dashboardUpdate = dashUpdate?.updateAvailable ?? false;
  const updateAvailable = frameworkUpdate || dashboardUpdate;
  const installedVersion = dashUpdate?.currentVersion ?? status?.version?.installed;
  const latestVersion = dashUpdate?.latestVersion ?? status?.version?.latest;

  const nav = (page: Page) => onNavigate?.(page);

  return (
    <header className="h-12 shrink-0 border-b border-[#1e1e2e] bg-[#111118] px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={() => nav("health")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <StatusBadge status={vpsStatus} label="VPS" />
          <StatusBadge status={localStatus} label="Local" />
        </button>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <button onClick={() => nav("agents")} className="text-xs text-[#71717a] font-mono hover:text-[#e4e4e7] transition-colors">
          Ollama: {ollamaStatus === "running" ? `${loadedCount} model${loadedCount !== 1 ? "s" : ""} loaded` : ollamaStatus}
          {tps ? ` \u00b7 ${tps} t/s` : ""}
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => nav("tokens")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xs text-[#71717a] font-mono hover:text-[#e4e4e7] transition-colors">
            ${monthSpend.toFixed(0)} this month
          </span>
        </button>
        {updateAvailable && (
          <>
            <div className="h-4 w-px bg-[#1e1e2e]" />
            <button onClick={() => nav("settings")} className="flex items-center gap-1.5 text-amber-400 hover:opacity-80 transition-opacity">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono">
                v{installedVersion} &rarr; v{latestVersion}
              </span>
            </button>
          </>
        )}
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <button onClick={() => nav("needs")} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-400">
            {needsCount}
          </span>
          <span className="text-xs text-[#71717a] hover:text-[#e4e4e7] transition-colors">needs</span>
        </button>
        <div className="h-4 w-px bg-[#1e1e2e]" />
        <div className="flex items-center gap-1">
          {wsStatus === "connected" && <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
          {wsStatus === "reconnecting" && <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
          {wsStatus === "disconnected" && <WifiOff className="h-3.5 w-3.5 text-rose-400" />}
          <span className="text-[10px] font-mono text-[#71717a] hidden lg:inline">
            {wsStatus === "connected" ? "Live" : wsStatus === "reconnecting" ? "Reconnecting" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
