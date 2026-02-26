import { useApiData } from "@/hooks/useApiData";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { Check, ArrowUpCircle, ExternalLink, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface UpdateStatus {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  commitsBehind: number;
  currentSha: string;
  latestSha: string;
}

export function FrameworkVersion() {
  const { data: settings, loading: sLoading, error: sError, refresh: sRefresh } = useApiData<SettingsData>("settings");
  const { data: status, loading: stLoading, error: stError, refresh: stRefresh } = useApiData<StatusData>("status");
  const { data: dashUpdate, refresh: updateRefresh } = useApiData<UpdateStatus>("update/check", 600);
  const { showToast } = useToast();

  const updateAction = useAction({
    endpoint: "/api/actions/update/apply",
    onSuccess: (data) => {
      const result = data as { newVersion?: string; restartRequired?: boolean };
      showToast("success", `Updated to v${result.newVersion ?? "latest"}. Restart the server to apply.`);
      updateRefresh();
    },
    onError: (err) => showToast("error", `Update failed: ${err}`),
  });

  const loading = sLoading || stLoading;
  const error = sError || stError;
  const refresh = () => { sRefresh(); stRefresh(); updateRefresh(); };

  const version = settings?.version ?? status?.version;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Framework</h3>
        {version ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Version</span>
              <a
                href="https://github.com/marcusquinn/aidevops"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#e4e4e7] flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
              >
                {version.installed}
                {!version.updateAvailable ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 text-amber-400" />
                )}
                <ExternalLink className="h-3 w-3 text-[#3f3f46]" />
              </a>
            </div>
            {version.updateAvailable && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Latest</span>
                <span className="text-xs font-mono text-amber-400">{version.latest}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717a]">Dashboard</span>
              <div className="flex items-center gap-1.5">
                <a
                  href="https://github.com/johnwaldo/aidevops-dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
                >
                  v{dashboardVersion}
                  {dashUpdate && !dashUpdate.updateAvailable && (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  {dashUpdate?.updateAvailable && (
                    <ArrowUpCircle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <ExternalLink className="h-3 w-3 text-[#3f3f46]" />
                </a>
              </div>
            </div>
            {dashUpdate?.updateAvailable && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#71717a]">Latest</span>
                  <span className="text-xs font-mono text-amber-400">
                    v{dashUpdate.latestVersion} ({dashUpdate.commitsBehind} commit{dashUpdate.commitsBehind !== 1 ? "s" : ""} behind)
                  </span>
                </div>
                <ConfirmDialog
                  title="Update Dashboard"
                  description={`Update from v${dashUpdate.currentVersion} to v${dashUpdate.latestVersion}? This will pull the latest code, install dependencies, and rebuild the client. You'll need to restart the server afterward.`}
                  confirmLabel="Update Now"
                  onConfirm={async () => {
                    await updateAction.execute({});
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs border-amber-400/30 text-amber-400 hover:text-[#e4e4e7] hover:bg-amber-400/10 gap-1.5 mt-1"
                    disabled={updateAction.loading}
                  >
                    {updateAction.loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {updateAction.loading ? "Updating..." : "Apply Update"}
                  </Button>
                </ConfirmDialog>
              </>
            )}
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
