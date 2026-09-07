"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { KanbanColumnProps } from "@/types/components";

export function KanbanColumn({
  title,
  column,
  count,
  children,
  onAddTask,
  canCreateTask = true,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: {
      type: "Column",
      column,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 min-w-[18rem] flex-col rounded-xl border transition-colors duration-200 bg-surface-2 p-3 ${
        isOver ? "border-accent ring-2 ring-accent/20 bg-surface-2/80" : "border-border"
      }`}
    >
      <header className="mb-3 flex items-center justify-between text-sm">
        <h2 className="font-semibold text-fg">
          {title} <span className="text-muted font-normal">· {count}</span>
        </h2>
        {canCreateTask && onAddTask ? (
          <button
            type="button"
            onClick={() => onAddTask(column)}
            aria-label={`Add task to ${title}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-fg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-muted opacity-40">
            <Plus className="h-4 w-4" />
          </span>
        )}
      </header>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}
