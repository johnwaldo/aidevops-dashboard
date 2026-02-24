import { useApiData } from "@/hooks/useApiData";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";
import { Lock, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

interface SSLCert {
  domain: string;
  issuer: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  status: "valid" | "expiring" | "critical" | "expired" | "error";
  error: string | null;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  valid: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-emerald-400", label: "Valid" },
  expiring: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-400", label: "Expiring" },
  critical: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-orange-400", label: "Critical" },
  expired: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-rose-400", label: "Expired" },
  error: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-[#71717a]", label: "Error" },
};

export function SSLPanel() {
  const { data: certs, loading, error, refresh } = useApiData<SSLCert[]>("ssl", 300);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!certs || certs.length === 0 ? (
        <EmptyState message="No SSL certificates monitored" />
      ) : (
        <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-[#71717a]" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">SSL Certificates</h3>
          </div>
          <div className="space-y-2">
            {certs.map((cert) => {
              const cfg = statusConfig[cert.status] ?? statusConfig.error;
              return (
                <div key={cert.domain} className="flex items-center gap-3 rounded bg-[#0a0a0f] px-3 py-2">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-[#e4e4e7] truncate">{cert.domain}</p>
                    {cert.issuer && (
                      <p className="text-[10px] font-mono text-[#71717a] truncate">{cert.issuer}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {cert.daysRemaining != null ? (
                      <span className={`text-xs font-mono ${cert.daysRemaining > 14 ? "text-emerald-400" : cert.daysRemaining > 7 ? "text-amber-400" : "text-rose-400"}`}>
                        {cert.daysRemaining}d
                      </span>
                    ) : cert.error ? (
                      <span className="text-[10px] font-mono text-rose-400 max-w-[120px] truncate block">{cert.error}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </LoadingPanel>
  );
}
