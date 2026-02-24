import { GitPullRequest, Clock, ShieldAlert, AlertTriangle, XCircle, Bot, CalendarClock, DollarSign, Lock, Settings, CircleX } from "lucide-react";
import { PriorityDot } from "@/components/shared/PriorityDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

export function NeedItem({ type, priority, title, source, age, project, impact }: NeedItemProps) {
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
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]">
            Review
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]">
            Snooze
          </Button>
        </div>
      </div>
    </div>
  );
}
