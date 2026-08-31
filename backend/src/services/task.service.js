const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const treeNodeRepo = require("../repos/treeNode.repo");
const workspaceRepo = require("../repos/workspace.repo");

function assertWorkspaceAndMembership(workspaceId, requesterId) {
  const workspace = workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return workspace;
}

function assertTreeNodeInWorkspace(treeNodeId, workspaceId) {
  const node = treeNodeRepo.findById(treeNodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${treeNodeId}' was not found.`);
  }
  if (node.workspaceId !== workspaceId) {
    throw new AppError(422, "VALIDATION_ERROR", "treeNodeId does not belong to this workspace.", [
      { path: "body.treeNodeId", message: "Tree node must exist in the workspace." },
    ]);
  }
  return node;
}

function assertMemberIdsSubset(memberIds, workspace) {
  const invalid = memberIds.filter((id) => !workspace.memberIds.includes(id));
  if (invalid.length > 0) {
    throw new AppError(422, "VALIDATION_ERROR", "memberIds must be a subset of workspace members.", [
      { path: "body.memberIds", message: `Unknown or non-member ids: ${invalid.join(", ")}` },
    ]);
  }
}

function assertDateOrder(startDate, dueDate) {
  if (startDate && dueDate && Date.parse(dueDate) < Date.parse(startDate)) {
    throw new AppError(422, "VALIDATION_ERROR", "dueDate must be on or after startDate.", [
      { path: "body.dueDate", message: "dueDate must be on or after startDate." },
    ]);
  }
}

function getTaskOrThrow(taskId) {
  const task = taskRepo.findById(taskId);
  if (!task) {
    throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
  }
  return task;
}

function listTasks(workspaceId, query, requesterId) {
  assertWorkspaceAndMembership(workspaceId, requesterId);
  return taskRepo.findByWorkspace(workspaceId, {
    treeNode: query.treeNode,
    column: query.column,
  });
}

function createTask(workspaceId, body, requesterId) {
  const workspace = assertWorkspaceAndMembership(workspaceId, requesterId);
  assertTreeNodeInWorkspace(body.treeNodeId, workspaceId);
  const memberIds = body.memberIds ?? [];
  assertMemberIdsSubset(memberIds, workspace);
  assertDateOrder(body.startDate, body.dueDate);

  return taskRepo.create({
    workspaceId,
    treeNodeId: body.treeNodeId,
    column: body.column,
    title: body.title,
    description: body.description,
    priority: body.priority,
    memberIds,
    startDate: body.startDate,
    dueDate: body.dueDate,
    completion: body.completion,
  });
}

function getTask(taskId, requesterId) {
  const task = getTaskOrThrow(taskId);
  assertWorkspaceAndMembership(task.workspaceId, requesterId);
  return task;
}

function updateTask(taskId, body, requesterId) {
  const task = getTaskOrThrow(taskId);
  const workspace = assertWorkspaceAndMembership(task.workspaceId, requesterId);

  if (body.version !== undefined && body.version !== task.version) {
    throw new AppError(409, "CONFLICT", "Task version conflict.", [
      { currentVersion: task.version, task: { ...task } },
    ]);
  }

  if (body.treeNodeId !== undefined) {
    assertTreeNodeInWorkspace(body.treeNodeId, task.workspaceId);
  }
  if (body.memberIds !== undefined) {
    assertMemberIdsSubset(body.memberIds, workspace);
  }

  const startDate = body.startDate !== undefined ? body.startDate : task.startDate;
  const dueDate = body.dueDate !== undefined ? body.dueDate : task.dueDate;
  assertDateOrder(startDate, dueDate);

  const { version: _version, ...patch } = body;
  const updated = taskRepo.update(taskId, { ...patch, version: task.version + 1 });
  return updated;
}

function moveTask(taskId, { column }, requesterId) {
  const task = getTaskOrThrow(taskId);
  assertWorkspaceAndMembership(task.workspaceId, requesterId);

  const updated = taskRepo.update(taskId, {
    column,
    version: task.version + 1,
  });
  return updated;
}

function deleteTask(taskId, requesterId) {
  const task = getTaskOrThrow(taskId);
  assertWorkspaceAndMembership(task.workspaceId, requesterId);
  taskRepo.remove(taskId);
  return { id: taskId, deleted: true };
}

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  moveTask,
  deleteTask,
};
