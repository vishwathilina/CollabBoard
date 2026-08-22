import type { TaskDetailDrawerProps } from "@/types/components";

export function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[420px] max-w-full border-l border-dashed border-border bg-surface p-6 text-sm text-muted">
      <div className="mb-3 flex items-center justify-between">
        <p>TaskDetailDrawer stub — Member 7{task ? ` (${task.title})` : ""}</p>
        <button type="button" aria-label="Close" onClick={onClose} className="text-fg">
          ×
        </button>
      </div>
    </div>
  );
}
