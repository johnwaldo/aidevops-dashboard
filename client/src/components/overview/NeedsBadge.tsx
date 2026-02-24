import { AlertTriangle, GitPullRequest, ShieldAlert, Clock, XCircle, Bot, CalendarClock, Settings } from "lucide-react";
import { useApiData } from "@/hooks/useApiData";
import { PriorityDot } from "@/components/shared/PriorityDot";
import { LoadingPanel } from "@/components/shared/LoadingPanel";

const typeIcons: Record<string, React.ReactNode> = {
  review: <GitPullRequest className="h-3.5 w-3.5" />,
  approval: <Clock className="h-3.5 w-3.5" />,
  security: <ShieldAlert className="h-3.5 w-3.5" />,
  expiring: <AlertTriangle className="h-3.5 w-3.5" />,
  failure: <XCircle className="h-3.5 w-3.5" />,
  agent: <Bot className="h-3.5 w-3.5" />,
  overdue: <CalendarClock className="h-3.5 w-3.5" />,
  config: <Settings className="h-3.5 w-3.5" />,
};

interface NeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  source: string;
  priority: string;
}

export function NeedsBadge() {
  const { data: needs, loading, error, refresh } = useApiData<NeedItem[]>("needs", 10);

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">Needs From Me</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-400">
            {needs?.length ?? 0}
          </span>
        </div>
        <div className="space-y-2.5">
          {(needs ?? []).slice(0, 5).map((need) => (
            <div key={need.id} className="flex items-start gap-2.5 group">
              <PriorityDot priority={need.priority} className="mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#e4e4e7] truncate group-hover:text-cyan-300 transition-colors">{need.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#71717a]">
                    {typeIcons[need.type] ?? typeIcons.config}
                    {need.source}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {needs?.length === 0 && (
            <p className="text-xs text-[#71717a] text-center py-2">Nothing needs your attention</p>
          )}
        </div>
      </div>
    </LoadingPanel>
  );
}
