const { AppError } = require("../utils/AppError");
const treeNodeRepo = require("../repos/treeNode.repo");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");
const taskRepo = require("../repos/task.repo");
const rbacService = require("./rbac.service");
const { eventBus } = require("../utils/eventBus");
const { getStore } = require("../store/memory.store");

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

/**
 * Ensure parent appears before child.
 * Topological sort by iteratively adding nodes whose parent already in sorted,
 * roots (parentId === null) first.
 */
function sortParentBeforeChild(nodes) {
  const idSet = new Set(nodes.map((n) => n.id));
  const sorted = [];
  const placed = new Set();

  // Roots first
  for (const r of nodes) {
    if (r.parentId === null || !idSet.has(r.parentId)) {
      sorted.push(r);
      placed.add(r.id);
    }
  }

  // Iteratively add children whose parent already placed
  let progress = true;
  while (sorted.length < nodes.length && progress) {
    progress = false;
    for (const node of nodes) {
      if (placed.has(node.id)) continue;
      if (node.parentId === null || placed.has(node.parentId) || !idSet.has(node.parentId)) {
        sorted.push(node);
        placed.add(node.id);
        progress = true;
      }
    }
  }

  // Fallback: if cycle or missing parent edge prevented placement, append remaining in original order
  if (sorted.length < nodes.length) {
    for (const node of nodes) {
      if (!placed.has(node.id)) {
        sorted.push(node);
        placed.add(node.id);
      }
    }
  }

  return sorted;
}

/**
 * Optionally recompute node.completion as average of descendant tasks' completion.
 * If no tasks for a node/subtree, keep stored completion.
 * This keeps UI progress consistent with actual task progress.
 */
function withRecomputedCompletion(nodes, workspaceTasks) {
  let tasks = workspaceTasks;
  if (!tasks) {
    try {
      const store = getStore();
      tasks = store.tasks || [];
    } catch {
      tasks = [];
    }
  }

  // Build parent -> children map for descendant traversal
  const childrenMap = new Map(); // parentId -> [childId]
  for (const n of nodes) {
    const pid = n.parentId;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid).push(n.id);
  }

  // Helper to collect all descendant ids inclusive
  function collectDescendantsInclusive(rootId) {
    const result = new Set([rootId]);
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop();
      const children = childrenMap.get(cur) || [];
      for (const childId of children) {
        if (!result.has(childId)) {
          result.add(childId);
          stack.push(childId);
        }
      }
    }
    return result;
  }

  return nodes.map((node) => {
    const descendantIds = collectDescendantsInclusive(node.id);
    const relatedTasks = tasks.filter((t) => descendantIds.has(t.treeNodeId));
    if (relatedTasks.length === 0) {
      return { ...node };
    }
    const sum = relatedTasks.reduce((acc, t) => acc + (t.completion || 0), 0);
    const avg = Math.round(sum / relatedTasks.length);
    return { ...node, completion: avg };
  });
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

async function listTree(workspaceId, userOrId) {
  const { workspace, user } = await assertWorkspaceAndMembership(workspaceId, userOrId, "workspace:read");
  const allNodes = await treeNodeRepo.findByWorkspace(workspaceId);

  // RBAC filter: developer & designer see visibleTreeNodeIds + ancestors + descendants;
  // owner, PM, QA, viewer, SPM see full tree
  const visibleNodes = rbacService.filterTreeNodes(workspace, user, allNodes);

  // Get tasks to recompute completion
  let tasks = [];
  try {
    tasks = (await taskRepo.findByWorkspace(workspaceId)) || [];
  } catch {
    tasks = [];
  }

  const nodesWithCompletion = withRecomputedCompletion(visibleNodes, tasks);
  return sortParentBeforeChild(nodesWithCompletion);
}

async function createNode(workspaceId, { parentId, name, completion }, userOrId) {
  const { workspace } = await assertWorkspaceAndMembership(workspaceId, userOrId, "tree:edit");

  const normalizedParentId = parentId === undefined ? null : parentId;
  if (normalizedParentId !== null) {
    const parent = await treeNodeRepo.findById(normalizedParentId);
    if (!parent) {
      throw new AppError(404, "NOT_FOUND", `Parent node '${normalizedParentId}' was not found.`);
    }
    if (parent.workspaceId !== workspaceId) {
      throw new AppError(400, "BAD_REQUEST", "Parent node belongs to a different workspace.");
    }
  }

  const node = await treeNodeRepo.create({
    workspaceId,
    parentId: normalizedParentId,
    name,
    completion,
  });
  eventBus.emit("tree:updated", { workspaceId, node });
  return node;
}

async function getNode(nodeId, userOrId) {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const node = await treeNodeRepo.findById(nodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${nodeId}' was not found.`);
  }

  const workspace = await workspaceRepo.findById(node.workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${node.workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "workspace:read");

  // Check if developer/designer has visibility of this node
  const allNodes = await treeNodeRepo.findByWorkspace(node.workspaceId);
  const visibleIds = new Set(rbacService.filterTreeNodeIds(workspace, user, allNodes));
  if (!visibleIds.has(nodeId)) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this tree node.");
  }

  return node;
}

async function updateNode(nodeId, patch, userOrId) {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const node = await treeNodeRepo.findById(nodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${nodeId}' was not found.`);
  }

  const workspace = await workspaceRepo.findById(node.workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${node.workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "tree:edit");

  if (patch.parentId !== undefined) {
    const newParentId = patch.parentId;
    if (newParentId === nodeId) {
      throw new AppError(409, "CONFLICT", "Cannot set parentId to self.");
    }
    if (newParentId !== null) {
      const parent = await treeNodeRepo.findById(newParentId);
      if (!parent) {
        throw new AppError(404, "NOT_FOUND", `Parent node '${newParentId}' was not found.`);
      }
      if (parent.workspaceId !== node.workspaceId) {
        throw new AppError(400, "BAD_REQUEST", "Parent node belongs to a different workspace.");
      }
      // Cycle detection: cannot set parentId to descendant
      const descendants = await treeNodeRepo.getDescendantIds(nodeId);
      if (descendants.has(newParentId)) {
        throw new AppError(409, "CONFLICT", "Cannot set parentId to a descendant (cycle detected).");
      }
    }
  }

  const updated = await treeNodeRepo.update(nodeId, patch);
  eventBus.emit("tree:updated", { workspaceId: node.workspaceId, node: updated });
  return updated;
}

async function deleteNode(nodeId, userOrId) {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const node = await treeNodeRepo.findById(nodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${nodeId}' was not found.`);
  }

  const workspace = await workspaceRepo.findById(node.workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${node.workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "tree:edit");

  if (await treeNodeRepo.hasChildren(nodeId)) {
    throw new AppError(409, "NODE_HAS_CHILDREN", `Node '${nodeId}' has children. Delete leaves first.`);
  }
  if (await treeNodeRepo.hasTasks(nodeId)) {
    throw new AppError(409, "NODE_HAS_TASKS", `Node '${nodeId}' still has tasks. Move or delete tasks first.`);
  }

  const deleted = await treeNodeRepo.remove(nodeId);
  eventBus.emit("tree:updated", { workspaceId: node.workspaceId, nodeId, deleted: true });
  return deleted;
}

module.exports = {
  resolveUser,
  assertWorkspaceAndMembership,
  listTree,
  createNode,
  getNode,
  updateNode,
  deleteNode,
  sortParentBeforeChild,
  withRecomputedCompletion,
};
