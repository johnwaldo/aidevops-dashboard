import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

interface StatusData {
  version: { installed: string; latest: string; updateAvailable: boolean };
  sections: { name: string; status: string; details?: string }[];
}

export function MCPConfig() {
  const { data: status, loading, error, refresh } = useApiData<StatusData>("status");

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">System Status</h3>
        {status?.sections && status.sections.length > 0 ? (
          <div className="space-y-2">
            {status.sections.map((section) => (
              <div key={section.name} className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">{section.name}</span>
                <span className="text-xs font-mono text-[#e4e4e7]">{section.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#71717a]">No status sections available</p>
        )}
      </div>
    </LoadingPanel>
  );
}
