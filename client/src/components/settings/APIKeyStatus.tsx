import { settingsMock } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle } from "lucide-react";

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  valid: { icon: <Check className="h-3.5 w-3.5" />, color: "text-emerald-400" },
  expiring: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-400" },
  missing: { icon: <X className="h-3.5 w-3.5" />, color: "text-rose-400" },
};

export function APIKeyStatus() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">API Keys</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1e1e2e]">
            <th className="text-left py-2 px-2 font-medium text-[#71717a]">Service</th>
            <th className="text-center py-2 px-2 font-medium text-[#71717a]">Configured</th>
            <th className="text-left py-2 px-2 font-medium text-[#71717a]">Status</th>
            <th className="text-right py-2 px-2 font-medium text-[#71717a]">Last Rotated</th>
          </tr>
        </thead>
        <tbody>
          {settingsMock.apiKeys.map((key) => {
            const cfg = statusConfig[key.status];
            return (
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
                  <span className={cn("inline-flex items-center gap-1", cfg.color)}>
                    {cfg.icon}
                    <span className="capitalize">{key.status}</span>
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-[#71717a] text-right">
                  {key.lastRotated ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
