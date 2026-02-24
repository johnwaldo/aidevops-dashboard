import { useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { kanbanMock } from "@/lib/mock-data";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";

type ColumnKey = "backlog" | "planned" | "inProgress" | "pendingApproval" | "recentlyCompleted";

const columnConfig: { key: ColumnKey; title: string; highlight?: boolean }[] = [
  { key: "backlog", title: "Backlog" },
  { key: "planned", title: "Planned" },
  { key: "inProgress", title: "In Progress" },
  { key: "pendingApproval", title: "Pending Approval", highlight: true },
  { key: "recentlyCompleted", title: "Completed" },
];

function getTaskProps(task: Record<string, unknown>, columnKey: ColumnKey) {
  const base = {
    id: task.id as string,
    title: task.title as string,
    project: task.project as string,
    priority: task.priority as string,
    agent: (task.agent as string | null) ?? null,
  };

  switch (columnKey) {
    case "backlog":
      return { ...base, timeLabel: "Est", timeValue: task.estimate as string };
    case "planned":
      return { ...base, timeLabel: "Est", timeValue: task.estimate as string };
    case "inProgress":
      return { ...base, timeLabel: "Elapsed", timeValue: task.elapsed as string };
    case "pendingApproval":
      return { ...base, timeLabel: "Waiting", timeValue: task.waiting as string, requires: task.requires as string };
    case "recentlyCompleted":
      return { ...base, timeLabel: "Total", timeValue: task.elapsed as string };
  }
}

export function KanbanBoard() {
  const [columns, setColumns] = useState(() => {
    const cols: Record<ColumnKey, string[]> = {
      backlog: kanbanMock.backlog.map((t) => t.id),
      planned: kanbanMock.planned.map((t) => t.id),
      inProgress: kanbanMock.inProgress.map((t) => t.id),
      pendingApproval: kanbanMock.pendingApproval.map((t) => t.id),
      recentlyCompleted: kanbanMock.recentlyCompleted.map((t) => t.id),
    };
    return cols;
  });

  const allTasks = [
    ...kanbanMock.backlog,
    ...kanbanMock.planned,
    ...kanbanMock.inProgress,
    ...kanbanMock.pendingApproval,
    ...kanbanMock.recentlyCompleted,
  ];

  const taskMap = Object.fromEntries(allTasks.map((t) => [t.id, t]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setColumns((prev) => {
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
              const props = getTaskProps(task as Record<string, unknown>, key);
              return <TaskCard key={taskId} {...props} />;
            })}
          </KanbanColumn>
        ))}
      </div>
    </DndContext>
  );
}
