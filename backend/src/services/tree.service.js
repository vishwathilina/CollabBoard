const { AppError } = require("../utils/AppError");
const treeNodeRepo = require("../repos/treeNode.repo");
const workspaceRepo = require("../repos/workspace.repo");
const { getStore } = require("../store/memory.store");

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
  const roots = nodes.filter((n) => n.parentId === null || !idSet.has(n.parentId));
  // To keep deterministic order, sort roots by original order? Keep insertion order.
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
function withRecomputedCompletion(nodes) {
  const store = getStore();
  const tasks = store.tasks;

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

function assertParentValid(parentId, workspaceId) {
  if (parentId === null || parentId === undefined) return;
  const parent = treeNodeRepo.findById(parentId);
  if (!parent) {
    throw new AppError(404, "NOT_FOUND", `Parent node '${parentId}' was not found.`);
  }
  if (parent.workspaceId !== workspaceId) {
    throw new AppError(400, "BAD_REQUEST", "Parent node belongs to a different workspace.");
  }
}

function listTree(workspaceId, requesterId) {
  assertWorkspaceAndMembership(workspaceId, requesterId);
  let nodes = treeNodeRepo.findByWorkspace(workspaceId);
  // Recompute completion from descendant tasks (if any tasks exist)
  nodes = withRecomputedCompletion(nodes);
  nodes = sortParentBeforeChild(nodes);
  return nodes;
}

function createNode(workspaceId, { parentId, name, completion }, requesterId) {
  assertWorkspaceAndMembership(workspaceId, requesterId);
  // Normalize parentId: undefined -> null
  const normalizedParentId = parentId === undefined ? null : parentId;
  assertParentValid(normalizedParentId, workspaceId);
  const node = treeNodeRepo.create({
    workspaceId,
    parentId: normalizedParentId,
    name,
    completion,
  });
  return node;
}

function getNode(nodeId, requesterId) {
  const node = treeNodeRepo.findById(nodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${nodeId}' was not found.`);
  }
  assertWorkspaceAndMembership(node.workspaceId, requesterId);
  // Single-node GET returns stored completion (not recomputed).
  // List GET (listTree) optionally recomputes completion from descendant tasks.
  return node;
}

function updateNode(nodeId, patch, requesterId) {
  const node = treeNodeRepo.findById(nodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${nodeId}' was not found.`);
  }
  assertWorkspaceAndMembership(node.workspaceId, requesterId);

  if (patch.parentId !== undefined) {
    const newParentId = patch.parentId;
    if (newParentId === nodeId) {
      throw new AppError(409, "CONFLICT", "Cannot set parentId to self.");
    }
    if (newParentId !== null) {
      const parent = treeNodeRepo.findById(newParentId);
      if (!parent) {
        throw new AppError(404, "NOT_FOUND", `Parent node '${newParentId}' was not found.`);
      }
      if (parent.workspaceId !== node.workspaceId) {
        throw new AppError(400, "BAD_REQUEST", "Parent node belongs to a different workspace.");
      }
      // Cycle detection: cannot set parentId to descendant
      const descendants = treeNodeRepo.getDescendantIds(nodeId);
      if (descendants.has(newParentId)) {
        throw new AppError(409, "CONFLICT", "Cannot set parentId to a descendant (cycle detected).");
      }
    }
  }

  const updated = treeNodeRepo.update(nodeId, patch);
  return updated;
}

function deleteNode(nodeId, requesterId) {
  const node = treeNodeRepo.findById(nodeId);
  if (!node) {
    throw new AppError(404, "NOT_FOUND", `Tree node '${nodeId}' was not found.`);
  }
  assertWorkspaceAndMembership(node.workspaceId, requesterId);

  if (treeNodeRepo.hasChildren(nodeId)) {
    throw new AppError(409, "NODE_HAS_CHILDREN", `Node '${nodeId}' has children. Delete leaves first.`);
  }
  if (treeNodeRepo.hasTasks(nodeId)) {
    throw new AppError(409, "NODE_HAS_TASKS", `Node '${nodeId}' still has tasks. Move or delete tasks first.`);
  }

  const deleted = treeNodeRepo.remove(nodeId);
  return deleted;
}

module.exports = {
  listTree,
  createNode,
  getNode,
  updateNode,
  deleteNode,
  sortParentBeforeChild, // exported for testing
  withRecomputedCompletion,
};
