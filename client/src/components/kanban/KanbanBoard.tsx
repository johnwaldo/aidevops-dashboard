import { useState, useEffect } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useApiData } from "@/hooks/useApiData";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

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

const columnConfig: { key: ColumnKey; title: string; highlight?: boolean }[] = [
  { key: "backlog", title: "Backlog" },
  { key: "planned", title: "Planned" },
  { key: "inProgress", title: "In Progress" },
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
      return { ...base, timeLabel: "Started", timeValue: task.started ?? "—" };
    case "pendingApproval":
      return { ...base, timeLabel: "In Review", timeValue: task.started ?? "—" };
    case "recentlyCompleted":
      return { ...base, timeLabel: "Completed", timeValue: task.completed ?? "—" };
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !columns) return;

    setColumns((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      for (const key of Object.keys(updated) as ColumnKey[]) {
        const col = updated[key];
        const oldIdx = col.indexOf(active.id as string);
        const newIdx = col.indexOf(over.id as string);
        if (oldIdx !== -1 && newIdx !== -1) {
          updated[key] = arrayMove(col, oldIdx, newIdx);
          break;
        }
      }
      return updated;
    });
  }

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!columns ? (
        <EmptyState message="No tasks found" />
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columnConfig.map(({ key, title, highlight }) => (
              <KanbanColumn
                key={key}
                id={key}
                title={title}
                count={columns[key].length}
                highlight={highlight}
                itemIds={columns[key]}
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
        </DndContext>
      )}
    </LoadingPanel>
  );
}
