import { GanttRow } from "@/components/gantt/GanttRow";
import { formatDate, formatDateRange } from "@/lib/format";
import { tasks, treeNodes } from "@/mocks/data";
import type { Task, TreeNode } from "@/types";
import type { GanttChartProps } from "@/types/components";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_BAR_PERCENT = 4;
const PX_PER_DAY = 28;

type TaskRange = {
  task: Task;
  start: number;
  due: number;
};

type TaskGroup = {
  node: TreeNode | null;
  items: TaskRange[];
};

function parseTime(iso: string): number | null {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

function utcDay(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function addUtcDays(ms: number, days: number): number {
  const date = new Date(ms);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
  );
}

function taskRange(task: Task): TaskRange | null {
  const start = parseTime(task.startDate);
  const due = parseTime(task.dueDate);

  if (start === null && due === null) return null;
  if (start === null && due !== null) return { task, start: due, due };
  if (due === null && start !== null) return { task, start, due: start };
  if (start !== null && due !== null) {
    return due < start ? { task, start, due: start } : { task, start, due };
  }
  return null;
}

/**
 * Bar placement is derived, never stored:
 *   spanMs  = axisEnd - axisStart
 *   left%   = (task.start - axisStart) / spanMs * 100
 *   width%  = (task.due - task.start) / spanMs * 100
 * Width is clamped to MIN_BAR_PERCENT so zero-length ranges still render.
 * Changing a task startDate/dueDate in mocks/data.ts moves the bar.
 */
function barPercents(
  start: number,
  due: number,
  axisStart: number,
  spanMs: number,
): { leftPercent: number; widthPercent: number } {
  const leftPercent = Math.min(
    100,
    Math.max(0, ((start - axisStart) / spanMs) * 100),
  );
  let widthPercent = Math.max(MIN_BAR_PERCENT, ((due - start) / spanMs) * 100);

  if (leftPercent + widthPercent > 100) {
    widthPercent = Math.max(0, 100 - leftPercent);
  }

  return { leftPercent, widthPercent };
}

function axisTicks(axisStart: number, axisEnd: number): number[] {
  const spanDays = (axisEnd - axisStart) / DAY_MS;
  const stepDays = spanDays <= 21 ? 1 : 7;
  const ticks: number[] = [];
  let cursor = axisStart;

  while (cursor < axisEnd) {
    ticks.push(cursor);
    cursor = addUtcDays(cursor, stepDays);
  }

  return ticks;
}

function groupByTreeNode(items: TaskRange[]): TaskGroup[] {
  const byNode = new Map<string, TaskRange[]>();
  const orphans: TaskRange[] = [];

  for (const item of items) {
    const node = treeNodes.find((entry) => entry.id === item.task.treeNodeId);
    if (!node) {
      orphans.push(item);
      continue;
    }
    const list = byNode.get(node.id) ?? [];
    list.push(item);
    byNode.set(node.id, list);
  }

  const groups: TaskGroup[] = [];

  for (const node of treeNodes) {
    const list = byNode.get(node.id);
    if (!list) continue;
    list.sort(
      (a, b) =>
        a.start - b.start || a.task.title.localeCompare(b.task.title),
    );
    groups.push({ node, items: list });
  }

  if (orphans.length > 0) {
    orphans.sort(
      (a, b) =>
        a.start - b.start || a.task.title.localeCompare(b.task.title),
    );
    groups.push({ node: null, items: orphans });
  }

  return groups;
}

export function GanttChart({ workspaceId }: GanttChartProps) {
  const ranges = tasks
    .filter((task) => task.workspaceId === workspaceId)
    .map(taskRange)
    .filter((item): item is TaskRange => item !== null);

  if (ranges.length === 0) {
    return (
      <p className="text-sm text-muted">No tasks in this workspace.</p>
    );
  }

  const minStart = Math.min(...ranges.map((item) => item.start));
  const maxDue = Math.max(...ranges.map((item) => item.due));
  const axisStart = utcDay(minStart);
  const axisEnd = addUtcDays(utcDay(maxDue), 1);
  const spanMs = Math.max(axisEnd - axisStart, DAY_MS);
  const ticks = axisTicks(axisStart, axisEnd);
  const gridlinePercents = ticks.map(
    (tick) => ((tick - axisStart) / spanMs) * 100,
  );
  const groups = groupByTreeNode(ranges);
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
            {ticks.map((tick, index) => {
              const left = ((tick - axisStart) / spanMs) * 100;
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

        {groups.map((group) => (
          <section key={group.node?.id ?? "ungrouped"}>
            <div className="flex bg-surface-2">
              <div className="sticky left-0 z-10 w-48 shrink-0 truncate bg-surface-2 px-3 py-1.5 text-xs font-semibold text-accent">
                {group.node?.name ?? "Ungrouped"}
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
              const { leftPercent, widthPercent } = barPercents(
                item.start,
                item.due,
                axisStart,
                spanMs,
              );

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
