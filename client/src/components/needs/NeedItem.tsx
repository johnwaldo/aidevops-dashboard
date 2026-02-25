import { useState } from "react";
import { GitPullRequest, Clock, ShieldAlert, AlertTriangle, XCircle, Bot, CalendarClock, DollarSign, Lock, Settings, CircleX, X, BellOff } from "lucide-react";
import { PriorityDot } from "@/components/shared/PriorityDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";

const typeIcons: Record<string, React.ReactNode> = {
  review: <GitPullRequest className="h-4 w-4" />,
  approval: <Clock className="h-4 w-4" />,
  security: <ShieldAlert className="h-4 w-4" />,
  expiring: <AlertTriangle className="h-4 w-4" />,
  failure: <XCircle className="h-4 w-4" />,
  agent: <Bot className="h-4 w-4" />,
  overdue: <CalendarClock className="h-4 w-4" />,
  budget: <DollarSign className="h-4 w-4" />,
  ssl: <Lock className="h-4 w-4" />,
  config: <Settings className="h-4 w-4" />,
  "ci-failure": <CircleX className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  review: "Review",
  approval: "Approval",
  security: "Security",
  expiring: "Expiring",
  failure: "Failure",
  agent: "Agent",
  overdue: "Overdue",
  budget: "Budget",
  ssl: "SSL",
  config: "Config",
  "ci-failure": "CI Failure",
};

interface NeedItemProps {
  id: number;
  type: string;
  priority: string;
  title: string;
  source: string;
  age: string;
  project: string;
  impact: string;
  onDismissed?: () => void;
}

const snoozeOptions = [
  { label: "1 hour", value: "1h" },
  { label: "4 hours", value: "4h" },
  { label: "1 day", value: "1d" },
  { label: "3 days", value: "3d" },
  { label: "7 days", value: "7d" },
];

export function NeedItem({ id, type, priority, title, source, age, project, impact, onDismissed }: NeedItemProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const { showToast } = useToast();

  const dismissAction = useAction({
    endpoint: "/api/actions/needs/dismiss",
    onSuccess: () => {
      setDismissed(true);
      showToast("success", "Need dismissed");
      onDismissed?.();
    },
    onError: (err) => showToast("error", `Failed to dismiss: ${err}`),
  });

  const snoozeAction = useAction({
    endpoint: "/api/actions/needs/snooze",
    onSuccess: () => {
      setDismissed(true);
      showToast("info", "Need snoozed");
      onDismissed?.();
    },
    onError: (err) => showToast("error", `Failed to snooze: ${err}`),
  });

  if (dismissed) return null;

  const needId = `need-${id}-${type}`;

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 transition-all hover:border-[#2e2e3e] group">
      <div className="flex items-start gap-3">
        <PriorityDot priority={priority} className="mt-1.5 shrink-0" />
        <span className="mt-0.5 shrink-0 text-[#71717a]">{typeIcons[type]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#e4e4e7] group-hover:text-cyan-300 transition-colors">{title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
              {typeLabels[type]}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
              {project}
            </Badge>
            <span className="text-[10px] font-mono text-[#71717a]">{source}</span>
            <span className="text-[10px] font-mono text-[#71717a]">{age}</span>
          </div>
          <p className="text-xs text-amber-400/70 mt-1.5">{impact}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Snooze button with dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]"
              onClick={() => setShowSnooze(!showSnooze)}
            >
              <BellOff className="h-3 w-3 mr-1" />
              Snooze
            </Button>
            {showSnooze && (
              <div className="absolute right-0 top-full mt-1 z-10 rounded-md border border-[#1e1e2e] bg-[#111118] shadow-lg py-1 min-w-[120px]">
                {snoozeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className="w-full text-left px-3 py-1.5 text-[10px] text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1e1e2e] transition-colors"
                    onClick={() => {
                      setShowSnooze(false);
                      snoozeAction.execute({ needId, duration: opt.value });
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <ConfirmDialog
            title="Dismiss need"
            description={`Permanently dismiss "${title}". It won't appear again.`}
            confirmLabel="Dismiss"
            onConfirm={() => dismissAction.execute({ needId })}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-rose-400 hover:border-rose-400/30"
            >
              <X className="h-3 w-3" />
            </Button>
          </ConfirmDialog>
        </div>
      </div>
    </div>
  );
}
