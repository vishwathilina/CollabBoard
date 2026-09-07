"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskCardProps, BadgeProps } from "@/types/components";
import { Badge } from "@/components/ui/Badge";
import { AvatarGroup } from "@/components/ui/AvatarGroup";
import { formatDate } from "@/lib/format";

export function TaskCard({
  task,
  members,
  highlighted,
  onClick,
  isDragging,
}: TaskCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group w-full text-left rounded-xl border bg-surface p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer select-none ${
        highlighted ? "border-accent" : "border-border hover:border-border"
      } ${
        isDragging
          ? "opacity-50 border-dashed border-accent scale-[1.02] shadow-lg"
          : "hover:shadow-md hover:border-muted"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-fg leading-tight">{task.title}</p>
        <Badge tone={`priority-${task.priority}` as BadgeProps["tone"]}>
          {task.priority}
        </Badge>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}
        </span>
        {typeof task.completion === "number" && task.completion > 0 && (
          <span className="text-xs text-muted font-medium">{task.completion}%</span>
        )}
      </div>

      {members.length > 0 && (
        <div className="mt-2">
          <AvatarGroup users={members} max={3} />
        </div>
      )}

      {task.description && (
        <p className="mt-2 text-xs text-muted line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}

export function SortableTaskCard({
  task,
  members,
  highlighted,
  onClick,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        task={task}
        members={members}
        highlighted={highlighted}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}
