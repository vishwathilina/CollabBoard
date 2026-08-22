import type { GanttChartProps } from "@/types/components";

export function GanttChart({ workspaceId }: GanttChartProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
      GanttChart stub — Member 8 (workspace {workspaceId})
    </div>
  );
}
