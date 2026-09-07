const { AppError } = require("../utils/AppError");

const ORG_ROLES = [
  "senior_project_manager",
  "project_manager",
  "developer",
  "designer",
  "qa",
  "stakeholder",
  "admin",
];

const WORKSPACE_ROLES = [
  "owner",
  "project_manager",
  "developer",
  "designer",
  "qa",
  "viewer",
];

/**
 * Extracts userId and optional orgRole from a user object or string ID.
 */
function extractUserInfo(userOrId) {
  if (!userOrId) return { userId: null, orgRole: null };
  if (typeof userOrId === "string") {
    return { userId: userOrId, orgRole: null };
  }
  return {
    userId: userOrId.id || userOrId._id || userOrId.userId || null,
    orgRole: userOrId.orgRole || null,
  };
}

/**
 * Returns membership object { userId, role, visibleTreeNodeIds } for a user in a workspace.
 * Senior Project Managers and Admins have virtual owner membership across all workspaces.
 */
function getMembership(workspace, userOrId) {
  if (!workspace) return null;
  const { userId, orgRole } = extractUserInfo(userOrId);
  if (!userId) return null;

  // Senior Project Managers and Admins possess full workspace owner privileges everywhere
  if (orgRole === "senior_project_manager" || orgRole === "admin") {
    return {
      userId,
      role: "owner",
      visibleTreeNodeIds: undefined,
    };
  }

  // Look up explicit membership
  const members = Array.isArray(workspace.members) ? workspace.members : [];
  const found = members.find((m) => m.userId === userId);

  if (found) {
    return {
      userId: found.userId,
      role: found.role,
      visibleTreeNodeIds: found.visibleTreeNodeIds,
    };
  }

  // Check if user is the workspace owner
  if (workspace.ownerId === userId) {
    return {
      userId,
      role: "owner",
      visibleTreeNodeIds: undefined,
    };
  }

  return null;
}

/**
 * Asserts whether a user is authorized to perform an action on a workspace.
 * Throws AppError(403, "FORBIDDEN", ...) if unauthorized.
 */
function assertCan(user, workspace, action) {
  const { userId, orgRole } = extractUserInfo(user);
  if (!userId) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const isSeniorPM = orgRole === "senior_project_manager" || orgRole === "admin";

  switch (action) {
    case "workspace:create": {
      const allowedOrgRoles = ["senior_project_manager", "project_manager", "admin"];
      if (!allowedOrgRoles.includes(orgRole)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Only Project Managers or Senior Project Managers can create workspaces."
        );
      }
      return true;
    }

    case "workspace:read": {
      if (isSeniorPM) return true;
      const membership = getMembership(workspace, user);
      if (!membership) {
        throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
      }
      return true;
    }

    case "workspace:update": {
      if (isSeniorPM) return true;
      const membership = getMembership(workspace, user);
      if (!membership || !["owner", "project_manager"].includes(membership.role)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Only workspace owners or Project Managers can update workspace settings."
        );
      }
      return true;
    }

    case "workspace:delete": {
      if (isSeniorPM) return true;
      if (workspace && workspace.ownerId === userId) return true;
      const membership = getMembership(workspace, user);
      if (membership && membership.role === "owner") return true;
      throw new AppError(
        403,
        "FORBIDDEN",
        "Only the workspace owner or Senior Project Manager can delete this workspace."
      );
    }

    case "members:invite":
    case "members:manage": {
      if (isSeniorPM) return true;
      const membership = getMembership(workspace, user);
      if (!membership || !["owner", "project_manager"].includes(membership.role)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Only workspace owners or Project Managers can manage workspace members."
        );
      }
      return true;
    }

    case "tree:edit": {
      if (isSeniorPM) return true;
      const membership = getMembership(workspace, user);
      if (!membership || !["owner", "project_manager"].includes(membership.role)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Only workspace owners or Project Managers can modify the work tree."
        );
      }
      return true;
    }

    case "chat:post": {
      if (isSeniorPM) return true;
      const membership = getMembership(workspace, user);
      if (!membership) {
        throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
      }
      if (membership.role === "viewer") {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Viewers have read-only access and cannot post messages."
        );
      }
      return true;
    }

    case "task:create":
    case "task:edit": {
      if (isSeniorPM) return true;
      const membership = getMembership(workspace, user);
      if (!membership) {
        throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
      }
      if (membership.role === "viewer") {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Viewers have read-only access and cannot modify tasks."
        );
      }
      return true;
    }

    default: {
      const membership = getMembership(workspace, user);
      if (!membership && !isSeniorPM) {
        throw new AppError(403, "FORBIDDEN", `You do not have permission to perform '${action}'.`);
      }
      return true;
    }
  }
}

/**
 * Given a membership (or workspace + user) and an array of TreeNodes,
 * filters and returns an array of visible TreeNode IDs.
 *
 * Rules:
 * - Owner, PM, QA, Viewer, SPM: sees all tree nodes.
 * - Developer / Designer: visibleTreeNodeIds + ancestors (for path context) + descendants.
 */
function filterTreeNodeIds(membershipOrWorkspace, userOrAllTreeNodes, maybeTreeNodes) {
  let membership;
  let allTreeNodes;

  // Handle both (membership, allTreeNodes) and (workspace, user, allTreeNodes)
  if (Array.isArray(userOrAllTreeNodes)) {
    membership = membershipOrWorkspace;
    allTreeNodes = userOrAllTreeNodes;
  } else {
    membership = getMembership(membershipOrWorkspace, userOrAllTreeNodes);
    allTreeNodes = maybeTreeNodes || [];
  }

  if (!membership) return [];

  // Full tree access roles
  if (["owner", "project_manager", "qa", "viewer"].includes(membership.role)) {
    return allTreeNodes.map((n) => n.id || n._id);
  }

  // Developer / Designer scoped access
  const allowedIds = new Set(membership.visibleTreeNodeIds || []);
  if (allowedIds.size === 0) return [];

  const nodeMap = new Map();
  const childrenMap = new Map();

  for (const node of allTreeNodes) {
    const id = node.id || node._id;
    nodeMap.set(id, node);
    if (node.parentId) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, []);
      }
      childrenMap.get(node.parentId).push(id);
    }
  }

  const visibleIds = new Set();

  for (const id of allowedIds) {
    if (!nodeMap.has(id)) continue;
    visibleIds.add(id);

    // 1. Traverse up to collect all ancestors (context path to root)
    let curr = nodeMap.get(id);
    while (curr && curr.parentId) {
      visibleIds.add(curr.parentId);
      curr = nodeMap.get(curr.parentId);
    }

    // 2. Traverse down (BFS) to collect all descendants
    const queue = [id];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = childrenMap.get(currentId) || [];
      for (const childId of children) {
        if (!visibleIds.has(childId)) {
          visibleIds.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  return Array.from(visibleIds);
}

/**
 * Filter tree node objects directly based on visible IDs.
 */
function filterTreeNodes(membershipOrWorkspace, userOrAllTreeNodes, maybeTreeNodes) {
  let allTreeNodes = Array.isArray(userOrAllTreeNodes) ? userOrAllTreeNodes : maybeTreeNodes || [];
  const visibleIds = new Set(filterTreeNodeIds(membershipOrWorkspace, userOrAllTreeNodes, maybeTreeNodes));
  return allTreeNodes.filter((n) => visibleIds.has(n.id || n._id));
}

/**
 * Checks if a user can move a task into targetColumn.
 *
 * Rules:
 * - SPM / Admin / Owner / PM: can move any task to any column.
 * - Viewer: cannot move tasks (read-only).
 * - QA: can only move tasks into "review" or "done".
 * - Developer / Designer: can move if assigned to task OR task belongs to scoped visible node.
 */
function canMoveTask(user, workspace, task, targetColumn) {
  const { userId, orgRole } = extractUserInfo(user);
  if (!userId) return false;

  if (orgRole === "senior_project_manager" || orgRole === "admin") {
    return true;
  }

  const membership = getMembership(workspace, user);
  if (!membership) return false;

  // Viewers cannot drag
  if (membership.role === "viewer") {
    return false;
  }

  // Owner and PM can drag any task
  if (membership.role === "owner" || membership.role === "project_manager") {
    return true;
  }

  // QA can only drag into "review" or "done"
  if (membership.role === "qa") {
    return ["review", "done"].includes(targetColumn);
  }

  // Developer and Designer can drag assigned or scoped tasks
  if (membership.role === "developer" || membership.role === "designer") {
    const isAssigned =
      Array.isArray(task.memberIds) && task.memberIds.includes(userId);
    const isScoped =
      Array.isArray(membership.visibleTreeNodeIds) &&
      membership.visibleTreeNodeIds.includes(task.treeNodeId);

    return isAssigned || isScoped;
  }

  return false;
}

/**
 * Asserts whether a user can move a task. Throws AppError(403) with clear message if not.
 */
function assertCanMoveTask(user, workspace, task, targetColumn) {
  const allowed = canMoveTask(user, workspace, task, targetColumn);
  if (!allowed) {
    const membership = getMembership(workspace, user);
    if (!membership) {
      throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
    }
    if (membership.role === "viewer") {
      throw new AppError(403, "FORBIDDEN", "Viewers have read-only access and cannot move tasks.");
    }
    if (membership.role === "qa") {
      throw new AppError(
        403,
        "FORBIDDEN",
        "QA members can only move tasks into 'Review' or 'Done'."
      );
    }
    if (membership.role === "developer" || membership.role === "designer") {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You can only move tasks that are assigned to you or in your scoped phases."
      );
    }
    throw new AppError(403, "FORBIDDEN", "You do not have permission to move this task.");
  }
  return true;
}

module.exports = {
  ORG_ROLES,
  WORKSPACE_ROLES,
  getMembership,
  assertCan,
  filterTreeNodeIds,
  filterTreeNodes,
  canMoveTask,
  assertCanMoveTask,
};
