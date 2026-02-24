import { useApiData } from "@/hooks/useApiData";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

interface SettingsData {
  version: { installed: string; latest: string; updateAvailable: boolean };
  apiKeys: { service: string; configured: boolean; status: string }[];
}

const statusColors: Record<string, string> = {
  valid: "text-emerald-400",
  expiring: "text-amber-400",
  missing: "text-rose-400",
};

export function APIKeyStatus() {
  const { data: settings, loading, error, refresh } = useApiData<SettingsData>("settings");

  const apiKeys = settings?.apiKeys ?? [];

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {apiKeys.length === 0 ? (
        <EmptyState message="No API keys configured" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">API Keys</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                <th className="text-left py-2 px-2 font-medium text-[#71717a]">Service</th>
                <th className="text-center py-2 px-2 font-medium text-[#71717a]">Configured</th>
                <th className="text-left py-2 px-2 font-medium text-[#71717a]">Status</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.service} className="border-b border-[#1e1e2e]/50 hover:bg-[#1e1e2e]/20">
                  <td className="py-2 px-2 font-mono text-[#e4e4e7]">{key.service}</td>
                  <td className="py-2 px-2 text-center">
                    {key.configured ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-rose-400 mx-auto" />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className={cn("capitalize", statusColors[key.status] ?? "text-[#71717a]")}>
                      {key.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LoadingPanel>
  );
}
