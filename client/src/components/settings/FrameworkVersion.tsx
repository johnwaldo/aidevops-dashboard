import { useApiData } from "@/hooks/useApiData";
import { Check, ArrowUpCircle } from "lucide-react";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

const dashboardVersion = __DASHBOARD_VERSION__;

interface SettingsData {
  version: { installed: string; latest: string; updateAvailable: boolean };
  apiKeys: { service: string; configured: boolean; status: string }[];
}

interface StatusData {
  version: { installed: string; latest: string; updateAvailable: boolean };
  sections: unknown[];
}

export function FrameworkVersion() {
  const { data: settings, loading: sLoading, error: sError, refresh: sRefresh } = useApiData<SettingsData>("settings");
  const { data: status, loading: stLoading, error: stError, refresh: stRefresh } = useApiData<StatusData>("status");

  const loading = sLoading || stLoading;
  const error = sError || stError;
  const refresh = () => { sRefresh(); stRefresh(); };

  const version = settings?.version ?? status?.version;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Framework</h3>
        {version ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Version</span>
              <span className="text-xs font-mono text-[#e4e4e7] flex items-center gap-1.5">
                {version.installed}
                {!version.updateAvailable ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 text-amber-400" />
                )}
              </span>
            </div>
            {version.updateAvailable && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Latest</span>
                <span className="text-xs font-mono text-amber-400">{version.latest}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Dashboard</span>
              <span className="text-xs font-mono text-cyan-400">v{dashboardVersion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Repository</span>
              <span className="text-xs font-mono text-[#71717a]">~/Git/aidevops</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Agents</span>
              <span className="text-xs font-mono text-[#71717a]">~/.aidevops/agents</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#71717a]">Version info unavailable</p>
        )}
      </div>
    </LoadingPanel>
  );
}
