import type { MessageChannelProps } from "@/types/components";

export function MessageChannel({ taskId }: MessageChannelProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
      MessageChannel stub — Member 8 (task {taskId})
    </div>
  );
}
