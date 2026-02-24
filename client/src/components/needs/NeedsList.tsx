import { needsMock } from "@/lib/mock-data";
import { NeedItem } from "./NeedItem";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityOrder = ["critical", "high", "medium", "low"] as const;
const priorityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};
const priorityColors: Record<string, string> = {
  critical: "text-rose-400",
  high: "text-amber-400",
  medium: "text-cyan-400",
  low: "text-zinc-400",
};

export function NeedsList() {
  const grouped = priorityOrder.map((p) => ({
    priority: p,
    items: needsMock.filter((n) => n.priority === p),
  }));

  return (
    <div className="space-y-3">
      {grouped.map(({ priority, items }) => (
        items.length > 0 && (
          <Collapsible key={priority} defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1 group">
              <ChevronDown className="h-4 w-4 text-[#71717a] transition-transform group-data-[state=closed]:-rotate-90" />
              <span className={cn("text-xs font-medium uppercase tracking-wider", priorityColors[priority])}>
                {priorityLabels[priority]}
              </span>
              <span className="text-[10px] font-mono text-[#71717a]">({items.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {items.map((need) => (
                <NeedItem key={need.id} {...need} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )
      ))}
    </div>
  );
}
