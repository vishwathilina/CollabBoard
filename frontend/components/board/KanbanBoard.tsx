"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { tasks, users } from "@/mocks/data";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import type { TaskColumn } from "@/types";

const COLUMNS: { id: TaskColumn; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export function KanbanBoard({ workspaceId }: { workspaceId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const treeNodeId = searchParams.get("treeNode");
  const taskId = searchParams.get("task");

  const boardTasks = tasks.filter((t) => {
    if (t.workspaceId !== workspaceId) return false;
    if (treeNodeId && t.treeNodeId !== treeNodeId) return false;
    return true;
  });

  const clearFilter = () => {
    const params = new URLSearchParams();
    if (taskId) params.set("task", taskId);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="flex h-full flex-col">
      {treeNodeId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-2 text-sm">
          <span className="font-medium text-accent">Filtered by tree node</span>
          <button
            type="button"
            onClick={clearFilter}
            className="ml-auto text-muted underline hover:text-fg"
          >
            Clear filter
          </button>
        </div>
      )}
      <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = boardTasks.filter((t) => t.column === col.id);
          return (
            <KanbanColumn
              key={col.id}
              title={col.title}
              column={col.id}
              count={colTasks.length}
            >
              {colTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted">
                  No tasks
                </div>
              ) : (
                colTasks.map((t) => {
                  const members = users.filter((u) => t.memberIds.includes(u.id));
                  return (
                    <TaskCard
                      key={t.id}
                      task={t}
                      members={members}
                      highlighted={t.id === taskId}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("task", t.id);
                        router.replace(`?${params.toString()}`);
                      }}
                    />
                  );
                })
              )}
            </KanbanColumn>
          );
        })}
      </div>
    </div>
  );
}
