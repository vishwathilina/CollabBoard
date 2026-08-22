import type { AttachmentListProps } from "@/types/components";

export function AttachmentList({ taskId }: AttachmentListProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
      AttachmentList stub — Member 8 (task {taskId})
    </div>
  );
}
