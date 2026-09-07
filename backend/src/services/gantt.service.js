const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const treeNodeRepo = require("../repos/treeNode.repo");
const workspaceRepo = require("../repos/workspace.repo");
const rbacService = require("./rbac.service");

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_BAR_PERCENT = 4;

function parseTime(iso) {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

function utcDay(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function addUtcDays(ms, days) {
  const date = new Date(ms);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
  );
}

function taskRange(task) {
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

function barPercents(start, due, axisStart, spanMs) {
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

function axisTicks(axisStart, axisEnd) {
  const spanDays = (axisEnd - axisStart) / DAY_MS;
  const stepDays = spanDays <= 21 ? 1 : 7;
  const ticks = [];
  let cursor = axisStart;

  while (cursor < axisEnd) {
    ticks.push(cursor);
    cursor = addUtcDays(cursor, stepDays);
  }

  return ticks;
}

function groupByTreeNode(items, treeNodes) {
  const byNode = new Map();
  const orphans = [];

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

  const groups = [];

  for (const node of treeNodes) {
    const list = byNode.get(node.id);
    if (!list) continue;
    list.sort(
      (a, b) => a.start - b.start || a.task.title.localeCompare(b.task.title),
    );
    groups.push({ treeNode: node, items: list });
  }

  if (orphans.length > 0) {
    orphans.sort(
      (a, b) => a.start - b.start || a.task.title.localeCompare(b.task.title),
    );
    groups.push({ treeNode: null, items: orphans });
  }

  return groups;
}

async function getGantt(workspaceId, requesterId) {
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  const uid = typeof requesterId === "object" ? (requesterId.id || requesterId._id) : requesterId;
  const isSeniorPM = typeof requesterId === "object" && (requesterId.orgRole === "senior_project_manager" || requesterId.orgRole === "admin");
  const wsMemberIds = workspace.memberIds || (workspace.members || []).map((m) => m.userId);

  if (!isSeniorPM && !wsMemberIds.includes(uid) && workspace.ownerId !== uid) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }

  const allTreeNodes = await treeNodeRepo.findByWorkspace(workspaceId);
  const user = typeof requesterId === "object" ? requesterId : { id: requesterId };
  const visibleNodeIds = new Set(rbacService.filterTreeNodeIds(workspace, user, allTreeNodes));

  const treeNodes = allTreeNodes.filter((node) => visibleNodeIds.has(node.id));
  const allTasks = await taskRepo.findByWorkspace(workspaceId);
  const tasks = allTasks.filter((task) => visibleNodeIds.has(task.treeNodeId));
  const ranges = tasks.map(taskRange).filter((item) => item !== null);

  if (ranges.length === 0) {
    return { axisStart: null, axisEnd: null, ticks: [], groups: [] };
  }

  const minStart = Math.min(...ranges.map((item) => item.start));
  const maxDue = Math.max(...ranges.map((item) => item.due));
  const axisStartMs = utcDay(minStart);
  const axisEndMs = addUtcDays(utcDay(maxDue), 1);
  const spanMs = Math.max(axisEndMs - axisStartMs, DAY_MS);
  const tickMs = axisTicks(axisStartMs, axisEndMs);
  const rawGroups = groupByTreeNode(ranges, treeNodes);

  const groups = rawGroups.map((group) => ({
    treeNode: group.treeNode,
    items: group.items.map((item) => {
      const { leftPercent, widthPercent } = barPercents(
        item.start,
        item.due,
        axisStartMs,
        spanMs,
      );
      return {
        task: { ...item.task },
        start: new Date(item.start).toISOString(),
        due: new Date(item.due).toISOString(),
        leftPercent,
        widthPercent,
      };
    }),
  }));

  return {
    axisStart: new Date(axisStartMs).toISOString(),
    axisEnd: new Date(axisEndMs).toISOString(),
    ticks: tickMs.map((ms) => new Date(ms).toISOString()),
    groups,
  };
}

module.exports = {
  getGantt,
  parseTime,
  utcDay,
  addUtcDays,
  taskRange,
  barPercents,
  axisTicks,
  groupByTreeNode,
};
