import {
  GitCommitHorizontal,
  XCircle,
  Rocket,
  Bot,
  ShieldAlert,
} from "lucide-react";
import { recentActivityMock } from "@/lib/mock-data";

const typeIcons: Record<string, React.ReactNode> = {
  commit: <GitCommitHorizontal className="h-3.5 w-3.5 text-cyan-400" />,
  ci: <XCircle className="h-3.5 w-3.5 text-rose-400" />,
  deploy: <Rocket className="h-3.5 w-3.5 text-emerald-400" />,
  agent: <Bot className="h-3.5 w-3.5 text-violet-400" />,
  security: <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />,
};

export function RecentActivity() {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {recentActivityMock.map((event) => (
          <div key={event.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">{typeIcons[event.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#e4e4e7] truncate">{event.message}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-[#71717a]">{event.project}</span>
                {event.agent && (
                  <span className="text-[10px] font-mono text-violet-400/70">{event.agent}</span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-mono text-[#71717a]">{event.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
