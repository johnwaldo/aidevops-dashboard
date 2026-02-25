import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  highlight?: boolean;
  children: React.ReactNode;
  itemIds: string[];
  headerExtra?: React.ReactNode;
}

export function KanbanColumn({ id, title, count, highlight, children, itemIds, headerExtra }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex flex-col rounded-md border bg-[#111118] min-w-[240px] max-w-[300px] flex-1",
        highlight ? "border-amber-500/30 shadow-sm shadow-amber-500/5" : "border-[#1e1e2e]"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a]">{title}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1e1e2e] px-1.5 text-[10px] font-mono text-[#71717a]">
            {count}
          </span>
        </div>
        {headerExtra}
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}
