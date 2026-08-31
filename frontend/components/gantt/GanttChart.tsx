"use client";

import { useEffect, useState } from "react";
import { GanttRow } from "@/components/gantt/GanttRow";
import { formatDate, formatDateRange } from "@/lib/format";
import { apiFetch, getToken } from "@/lib/api";
import type { Task, TreeNode } from "@/types";
import type { GanttChartProps } from "@/types/components";

const DAY_MS = 24 * 60 * 60 * 1000;
const PX_PER_DAY = 28;

type GanttGroup = {
  treeNode: TreeNode | null;
  items: {
    task: Task;
    leftPercent: number;
    widthPercent: number;
  }[];
};

type GanttData = {
  axisStart: string | null;
  axisEnd: string | null;
  ticks: string[];
  groups: GanttGroup[];
};

export function GanttChart({ workspaceId }: GanttChartProps) {
  const [data, setData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiFetch<GanttData>(`/api/workspaces/${workspaceId}/gantt`, { token })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return <div className="text-sm text-muted">Loading Gantt...</div>;
  }

  if (!data || data.groups.length === 0 || !data.axisStart || !data.axisEnd) {
    return <p className="text-sm text-muted">No tasks in this workspace.</p>;
  }

  const axisStartMs = Date.parse(data.axisStart);
  const axisEndMs = Date.parse(data.axisEnd);
  const spanMs = Math.max(axisEndMs - axisStartMs, DAY_MS);
  
  const tickMsList = data.ticks.map(Date.parse);
  const gridlinePercents = tickMsList.map(
    (tick) => ((tick - axisStartMs) / spanMs) * 100,
  );

  const spanDays = Math.max(1, Math.ceil(spanMs / DAY_MS));
  const chartMinWidth = 192 + Math.max(640, spanDays * PX_PER_DAY);


  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <div style={{ minWidth: chartMinWidth }}>
        <div className="flex border-b border-border bg-surface-2">
          <div className="sticky left-0 z-20 w-48 shrink-0 bg-surface-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
            Task
          </div>
          <div className="relative h-10 min-w-0 flex-1">
            {tickMsList.map((tick, index) => {
              const left = ((tick - axisStartMs) / spanMs) * 100;
              const isFirst = index === 0;

              return (
                <span
                  key={tick}
                  className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-muted ${
                    isFirst ? "pl-1" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${left}%` }}
                >
                  {formatDate(new Date(tick).toISOString())}
                </span>
              );
            })}
          </div>
        </div>

        {data.groups.map((group) => (
          <section key={group.treeNode?.id ?? "ungrouped"}>
            <div className="flex bg-surface-2">
              <div className="sticky left-0 z-10 w-48 shrink-0 truncate bg-surface-2 px-3 py-1.5 text-xs font-semibold text-accent">
                {group.treeNode?.name ?? "Ungrouped"}
              </div>
              <div className="relative min-w-0 flex-1">
                {gridlinePercents.map((percent) => (
                  <span
                    key={percent}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-border"
                    style={{ left: `${percent}%` }}
                  />
                ))}
              </div>
            </div>

            {group.items.map((item) => {
              const { leftPercent, widthPercent } = item;

              return (
                <GanttRow
                  key={item.task.id}
                  title={item.task.title}
                  leftPercent={leftPercent}
                  widthPercent={widthPercent}
                  rangeLabel={formatDateRange(
                    item.task.startDate,
                    item.task.dueDate,
                  )}
                  gridlinePercents={gridlinePercents}
                />
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
