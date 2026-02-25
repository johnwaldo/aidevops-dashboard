import { useState, useEffect } from "react";
import { DndContext, closestCenter, type DragEndEvent, DragOverlay, type DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useApiData } from "@/hooks/useApiData";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskCreateDialog } from "@/components/actions/TaskCreateDialog";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";
import { Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  tags: string[];
  agents: string[];
  estimate: string;
  started: string | null;
  completed: string | null;
}

interface TasksData {
  backlog: Task[];
  ready: Task[];
  inProgress: Task[];
  inReview: Task[];
  done: Task[];
  declined: Task[];
}

type ColumnKey = "backlog" | "planned" | "inProgress" | "pendingApproval" | "recentlyCompleted";

// Map frontend column keys to backend section names
const columnToSection: Record<ColumnKey, string> = {
  backlog: "backlog",
  planned: "ready",
  inProgress: "inProgress",
  pendingApproval: "inReview",
  recentlyCompleted: "done",
};

const columnConfig: { key: ColumnKey; title: string; highlight?: boolean; createColumn?: string }[] = [
  { key: "backlog", title: "Backlog", createColumn: "backlog" },
  { key: "planned", title: "Planned", createColumn: "ready" },
  { key: "inProgress", title: "In Progress", createColumn: "inProgress" },
  { key: "pendingApproval", title: "Pending Approval", highlight: true },
  { key: "recentlyCompleted", title: "Completed" },
];

function getTaskProps(task: Task, columnKey: ColumnKey) {
  const base = {
    id: task.id,
    title: task.title,
    project: task.tags?.[0] ?? "",
    priority: task.priority,
    agent: task.agents?.[0] ?? null,
  };

  switch (columnKey) {
    case "backlog":
      return { ...base, timeLabel: "Est", timeValue: task.estimate };
    case "planned":
      return { ...base, timeLabel: "Est", timeValue: task.estimate };
    case "inProgress":
      return { ...base, timeLabel: "Started", timeValue: task.started ?? "\u2014" };
    case "pendingApproval":
      return { ...base, timeLabel: "In Review", timeValue: task.started ?? "\u2014" };
    case "recentlyCompleted":
      return { ...base, timeLabel: "Completed", timeValue: task.completed ?? "\u2014" };
  }
}

function mapApiToColumns(data: TasksData): Record<ColumnKey, Task[]> {
  return {
    backlog: data.backlog ?? [],
    planned: data.ready ?? [],
    inProgress: data.inProgress ?? [],
    pendingApproval: data.inReview ?? [],
    recentlyCompleted: data.done ?? [],
  };
}

export function KanbanBoard() {
  const { data, loading, error, refresh } = useApiData<TasksData>("tasks", 30);
  const [columns, setColumns] = useState<Record<ColumnKey, string[]> | null>(null);
  const [taskMap, setTaskMap] = useState<Record<string, Task>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const { showToast } = useToast();

  const moveAction = useAction({
    endpoint: "/api/actions/tasks/move",
  });

  useEffect(() => {
    if (!data) return;
    const mapped = mapApiToColumns(data);
    const allTasks: Task[] = [];
    const cols: Record<ColumnKey, string[]> = {
      backlog: [],
      planned: [],
      inProgress: [],
      pendingApproval: [],
      recentlyCompleted: [],
    };
    for (const key of Object.keys(cols) as ColumnKey[]) {
      const tasks = mapped[key];
      cols[key] = tasks.map((t) => t.id);
      allTasks.push(...tasks);
    }
    setColumns(cols);
    setTaskMap(Object.fromEntries(allTasks.map((t) => [t.id, t])));
  }, [data]);

  function findColumn(taskId: string): ColumnKey | null {
    if (!columns) return null;
    for (const key of Object.keys(columns) as ColumnKey[]) {
      if (columns[key].includes(taskId)) return key;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !columns) return;

    const activeTaskId = active.id as string;
    const sourceCol = findColumn(activeTaskId);
    if (!sourceCol) return;

    // Determine target column
    let targetCol: ColumnKey | null = null;
    if (Object.keys(columns).includes(over.id as string)) {
      targetCol = over.id as ColumnKey;
    } else {
      targetCol = findColumn(over.id as string);
    }
    if (!targetCol) return;

    // Same column reorder (local only, no backend call)
    if (sourceCol === targetCol) {
      const col = columns[sourceCol];
      const oldIdx = col.indexOf(activeTaskId);
      const newIdx = col.indexOf(over.id as string);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setColumns((prev) => {
          if (!prev) return prev;
          return { ...prev, [sourceCol]: arrayMove(prev[sourceCol], oldIdx, newIdx) };
        });
      }
      return;
    }

    // Cross-column move — optimistic update + backend call
    const prevColumns = { ...columns, [sourceCol]: [...columns[sourceCol]], [targetCol]: [...columns[targetCol]] };

    setColumns((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[sourceCol] = prev[sourceCol].filter((id) => id !== activeTaskId);
      updated[targetCol!] = [...prev[targetCol!], activeTaskId];
      return updated;
    });

    const success = await moveAction.execute({
      taskId: activeTaskId,
      from: columnToSection[sourceCol],
      to: columnToSection[targetCol],
    });

    if (success) {
      showToast("success", `Task moved to ${columnConfig.find((c) => c.key === targetCol)?.title}`);
      // Refresh to get updated metadata (started/completed dates)
      setTimeout(refresh, 500);
    } else {
      // Rollback
      setColumns(prevColumns);
      showToast("error", `Failed to move task: ${moveAction.error ?? "Unknown error"}`);
    }
  }

  const activeTask = activeId ? taskMap[activeId] : null;
  const activeCol = activeId ? findColumn(activeId) : null;

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!columns ? (
        <EmptyState message="No tasks found" />
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columnConfig.map(({ key, title, highlight, createColumn }) => (
              <KanbanColumn
                key={key}
                id={key}
                title={title}
                count={columns[key].length}
                highlight={highlight}
                itemIds={columns[key]}
                headerExtra={
                  createColumn ? (
                    <TaskCreateDialog defaultColumn={createColumn} onCreated={refresh}>
                      <button className="flex h-5 w-5 items-center justify-center rounded text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1e1e2e] transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </TaskCreateDialog>
                  ) : undefined
                }
              >
                {columns[key].map((taskId) => {
                  const task = taskMap[taskId];
                  if (!task) return null;
                  const props = getTaskProps(task, key);
                  return <TaskCard key={taskId} {...props} />;
                })}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTask && activeCol ? (
              <div className="opacity-80">
                <TaskCard {...getTaskProps(activeTask, activeCol)} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </LoadingPanel>
  );
}
