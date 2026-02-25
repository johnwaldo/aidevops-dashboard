import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export function KanbanPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Kanban</h1>
        <p className="text-sm text-[#71717a] mt-1">Task board with drag-and-drop.</p>
      </div>
      <KanbanBoard />
    </div>
  );
}
