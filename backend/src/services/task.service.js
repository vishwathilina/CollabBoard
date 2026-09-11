const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const treeNodeRepo = require("../repos/treeNode.repo");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");
const rbacService = require("./rbac.service");
const { eventBus } = require("../utils/eventBus");

/**
 * Resolves a user object ensuring id and orgRole are present.
 */
async function resolveUser(userOrId) {
  if (!userOrId) return null;
  if (typeof userOrId === "object" && (userOrId.id || userOrId._id || userOrId.userId)) {
    const id = userOrId.id || userOrId._id || userOrId.userId;
    const user = {
      id,
      email: userOrId.email,
      name: userOrId.name,
      orgRole: userOrId.orgRole,
    };
    if (!user.orgRole) {
      const dbUser = await userRepo.findById(id);
      if (dbUser) user.orgRole = dbUser.orgRole;
    }
    return user;
  }
  const dbUser = await userRepo.findById(userOrId);
  return dbUser || { id: userOrId, orgRole: "developer" };
}

async function assertWorkspaceAndMembership(workspaceId, userOrId, action = "workspace:read") {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  rbacService.assertCan(user, workspace, action);
  return { workspace, user };
}

async function assertTreeNodeInWorkspace(treeNodeId, workspaceId) {
  const node = await treeNodeRepo.findById(treeNodeId);
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
  const wsMemberIds = workspace.memberIds || (workspace.members || []).map((m) => m.userId);
  const invalid = memberIds.filter((id) => !wsMemberIds.includes(id));
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

async function getTaskOrThrow(taskId) {
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
  }
  return task;
}

async function listTasks(workspaceId, query, userOrId) {
  const { workspace, user } = await assertWorkspaceAndMembership(workspaceId, userOrId, "workspace:read");

  const allNodes = await treeNodeRepo.findByWorkspace(workspaceId);
  const visibleIds = rbacService.filterTreeNodeIds(workspace, user, allNodes);

  if (query.treeNode) {
    const visibleSet = new Set(visibleIds);
    if (!visibleSet.has(query.treeNode)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this tree node.");
    }
    return await taskRepo.findByWorkspace(workspaceId, {
      treeNode: query.treeNode,
      column: query.column,
    });
  }

  const membership = rbacService.getMembership(workspace, user);
  const isScoped = membership && ["developer", "designer"].includes(membership.role);

  return await taskRepo.findByWorkspace(workspaceId, {
    treeNodeIds: isScoped ? visibleIds : undefined,
    column: query.column,
  });
}

async function createTask(workspaceId, body, requesterId) {
  const { workspace, user } = await assertWorkspaceAndMembership(workspaceId, requesterId, "task:create");
  await assertTreeNodeInWorkspace(body.treeNodeId, workspaceId);
  const memberIds = body.memberIds ?? [];
  assertMemberIdsSubset(memberIds, workspace);
  assertDateOrder(body.startDate, body.dueDate);

  const created = await taskRepo.create({
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
    order: body.order,
    updatedBy: user.id,
  });

  eventBus.emit("task:created", {
    workspaceId,
    task: created,
  });

  return created;
}

async function getTask(taskId, requesterId) {
  const task = await getTaskOrThrow(taskId);
  await assertWorkspaceAndMembership(task.workspaceId, requesterId, "workspace:read");
  return task;
}

async function updateTask(taskId, body, requesterId) {
  const task = await getTaskOrThrow(taskId);
  const { workspace, user } = await assertWorkspaceAndMembership(task.workspaceId, requesterId, "task:edit");

  if (body.treeNodeId !== undefined) {
    await assertTreeNodeInWorkspace(body.treeNodeId, task.workspaceId);
  }
  if (body.memberIds !== undefined) {
    assertMemberIdsSubset(body.memberIds, workspace);
  }

  const startDate = body.startDate !== undefined ? body.startDate : task.startDate;
  const dueDate = body.dueDate !== undefined ? body.dueDate : task.dueDate;
  assertDateOrder(startDate, dueDate);

  const { version: clientVersion, ...patch } = body;

  if (clientVersion !== undefined) {
    if (clientVersion !== task.version) {
      throw new AppError(409, "CONFLICT", "Task version conflict.", [
        { currentVersion: task.version, task: { ...task } },
      ]);
    }

    const updated = await taskRepo.updateWithVersion(taskId, clientVersion, patch, user.id);
    if (!updated) {
      const current = await taskRepo.findById(taskId);
      if (!current) {
        throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
      }
      throw new AppError(409, "CONFLICT", "Task version conflict.", [
        { currentVersion: current.version, task: current },
      ]);
    }
    eventBus.emit("task:updated", {
      workspaceId: task.workspaceId,
      task: updated,
    });
    return updated;
  }

  const updated = await taskRepo.update(taskId, {
    ...patch,
    updatedBy: user.id,
    version: task.version + 1,
  });
  eventBus.emit("task:updated", {
    workspaceId: task.workspaceId,
    task: updated,
  });
  return updated;
}

async function moveTask(taskId, body, requesterId) {
  const task = await getTaskOrThrow(taskId);
  const { workspace, user } = await assertWorkspaceAndMembership(task.workspaceId, requesterId, "workspace:read");

  rbacService.assertCanMoveTask(user, workspace, task, body.column);

  const { column, order, version: clientVersion } = body;
  const targetOrder = order !== undefined ? order : task.order;

  if (clientVersion !== undefined) {
    if (clientVersion !== task.version) {
      throw new AppError(409, "CONFLICT", "Task version conflict.", [
        { currentVersion: task.version, task: { ...task } },
      ]);
    }

    const updated = await taskRepo.updateWithVersion(
      taskId,
      clientVersion,
      { column, order: targetOrder },
      user.id
    );
    if (!updated) {
      const current = await taskRepo.findById(taskId);
      if (!current) {
        throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
      }
      throw new AppError(409, "CONFLICT", "Task version conflict.", [
        { currentVersion: current.version, task: current },
      ]);
    }
    eventBus.emit("task:moved", {
      workspaceId: task.workspaceId,
      task: updated,
    });
    return updated;
  }

  const updated = await taskRepo.update(taskId, {
    column,
    order: targetOrder,
    updatedBy: user.id,
    version: task.version + 1,
  });
  eventBus.emit("task:moved", {
    workspaceId: task.workspaceId,
    task: updated,
  });
  return updated;
}

async function deleteTask(taskId, requesterId) {
  const task = await getTaskOrThrow(taskId);
  await assertWorkspaceAndMembership(task.workspaceId, requesterId, "task:edit");
  await taskRepo.remove(taskId);
  eventBus.emit("task:deleted", {
    workspaceId: task.workspaceId,
    taskId,
  });
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
