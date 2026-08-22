import type { TaskCardProps } from "@/types/components";

export function TaskCard({ task, members, highlighted, onClick }: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border border-dashed border-border bg-surface p-4 text-left text-sm text-muted ${
        highlighted ? "ring-1 ring-accent" : ""
      }`}
    >
      TaskCard stub — Member 6 ({task.title}, {members.length} members)
    </button>
  );
}
