import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PriorityDot } from "@/components/shared/PriorityDot";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  id: string;
  title: string;
  project: string;
  priority: string;
  agent: string | null;
  timeLabel?: string;
  timeValue?: string;
  requires?: string;
}

export function TaskCard({ id, title, project, priority, agent, timeLabel, timeValue, requires }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-md border border-[#1e1e2e] bg-[#0a0a0f] p-3 cursor-grab active:cursor-grabbing transition-all",
        "hover:border-[#2e2e3e] hover:shadow-lg hover:shadow-black/20",
        isDragging && "opacity-50 shadow-xl shadow-cyan-500/10 border-cyan-500/30"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <PriorityDot priority={priority} className="mt-1 shrink-0" />
        <p className="text-sm text-[#e4e4e7] leading-tight">{title}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
          {project}
        </Badge>
        {agent && (
          <span className="text-[10px] font-mono text-violet-400/70">{agent}</span>
        )}
        {timeValue && (
          <span className="text-[10px] font-mono text-[#71717a] ml-auto">
            {timeLabel ? `${timeLabel}: ` : ""}{timeValue}
          </span>
        )}
      </div>
      {requires && (
        <p className="text-[10px] text-amber-400/70 mt-1.5 italic">{requires}</p>
      )}
    </div>
  );
}
