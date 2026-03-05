import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskCreateDialog } from "@/components/actions/TaskCreateDialog";
import { RepoSelector } from "@/components/kanban/RepoSelector";
import { useRepos } from "@/hooks/useRepos";

export function KanbanPage() {
  const { enabledRepos, selectedRepo, setSelectedRepo } = useRepos();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Kanban</h1>
          <p className="text-sm text-[#71717a] mt-1">Task board with drag-and-drop. Drag tasks between columns to update TODO.md.</p>
        </div>
        <div className="flex items-center gap-3">
          <RepoSelector repos={enabledRepos} value={selectedRepo} onChange={setSelectedRepo} />
          <TaskCreateDialog defaultRepo={selectedRepo !== "all" ? selectedRepo : undefined} />
        </div>
      </div>
      <KanbanBoard selectedRepo={selectedRepo} />
    </div>
  );
}
