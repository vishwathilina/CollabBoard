const { AppError } = require("../utils/AppError");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");
const rbacService = require("./rbac.service");

/**
 * Resolves a user object ensuring id and orgRole are present.
 */
async function resolveUser(userOrId) {
  if (!userOrId) return null;
  if (typeof userOrId === "object" && (userOrId.id || userOrId._id)) {
    const user = {
      id: userOrId.id || userOrId._id,
      email: userOrId.email,
      name: userOrId.name,
      orgRole: userOrId.orgRole,
    };
    if (!user.orgRole) {
      const dbUser = await userRepo.findById(user.id);
      if (dbUser) user.orgRole = dbUser.orgRole;
    }
    return user;
  }
  const dbUser = await userRepo.findById(userOrId);
  return dbUser || { id: userOrId, orgRole: "developer" };
}

async function listForUser(userOrId) {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  // Senior Project Managers and Admins see ALL workspaces
  if (user.orgRole === "senior_project_manager" || user.orgRole === "admin") {
    return workspaceRepo.findAll();
  }

  return workspaceRepo.findByMember(user.id);
}

async function getById(workspaceId, userOrId) {
  const user = await resolveUser(userOrId);
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "workspace:read");
  return workspace;
}

async function create({ name, description, color }, userOrId) {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  // Enforce org role: only PM, SPM, or admin can create workspaces
  rbacService.assertCan(user, null, "workspace:create");

  return workspaceRepo.create({
    name,
    description,
    color,
    ownerId: user.id,
    creatorId: user.id,
    members: [{ userId: user.id, role: "owner" }],
  });
}

async function patch(workspaceId, patchData, userOrId) {
  const user = await resolveUser(userOrId);
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "workspace:update");
  return workspaceRepo.update(workspaceId, patchData);
}

async function remove(workspaceId, userOrId) {
  const user = await resolveUser(userOrId);
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "workspace:delete");
  return workspaceRepo.remove(workspaceId);
}

async function addMember(workspaceId, memberData, userOrId) {
  const user = await resolveUser(userOrId);
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "members:invite");

  // Support payload as string userId or object with { userId, email, role, visibleTreeNodeIds }
  let targetUser = null;
  let targetRole = "developer";
  let targetVisibleNodeIds = undefined;

  if (typeof memberData === "string") {
    targetUser = await userRepo.findById(memberData);
  } else if (memberData) {
    if (memberData.userId) {
      targetUser = await userRepo.findById(memberData.userId);
    } else if (memberData.email) {
      targetUser = await userRepo.findByEmail(memberData.email);
    }
    if (memberData.role) targetRole = memberData.role;
    if (memberData.visibleTreeNodeIds !== undefined) {
      targetVisibleNodeIds = memberData.visibleTreeNodeIds;
    }
  }

  if (!targetUser) {
    throw new AppError(404, "NOT_FOUND", "The specified user was not found.");
  }

  // Check if already a member
  const alreadyMember =
    (workspace.members && workspace.members.some((m) => m.userId === targetUser.id)) ||
    (workspace.memberIds && workspace.memberIds.includes(targetUser.id));

  if (alreadyMember) {
    throw new AppError(
      409,
      "CONFLICT",
      `User '${targetUser.email || targetUser.name || targetUser.id}' is already a member of this workspace.`
    );
  }

  return workspaceRepo.addMember(workspaceId, {
    userId: targetUser.id,
    role: targetRole,
    visibleTreeNodeIds: targetVisibleNodeIds,
  });
}

async function updateMember(workspaceId, targetUserId, patchData, userOrId) {
  const user = await resolveUser(userOrId);
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "members:manage");

  const member = workspace.members && workspace.members.find((m) => m.userId === targetUserId);
  if (!member) {
    throw new AppError(404, "NOT_FOUND", `User '${targetUserId}' is not a member of this workspace.`);
  }

  // Project Managers cannot alter the workspace owner's role
  const isSeniorPM = user.orgRole === "senior_project_manager" || user.orgRole === "admin";
  if (workspace.ownerId === targetUserId && patchData.role && patchData.role !== "owner" && !isSeniorPM) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only Senior Project Managers can alter the workspace owner's role."
    );
  }

  return workspaceRepo.updateMember(workspaceId, targetUserId, patchData);
}

async function removeMember(workspaceId, targetUserId, userOrId) {
  const user = await resolveUser(userOrId);
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }

  rbacService.assertCan(user, workspace, "members:manage");

  const member = workspace.members && workspace.members.find((m) => m.userId === targetUserId);
  const inMemberIds = workspace.memberIds && workspace.memberIds.includes(targetUserId);
  if (!member && !inMemberIds) {
    throw new AppError(404, "NOT_FOUND", `User '${targetUserId}' is not a member of this workspace.`);
  }

  const isSeniorPM = user.orgRole === "senior_project_manager" || user.orgRole === "admin";
  if (workspace.ownerId === targetUserId && !isSeniorPM) {
    throw new AppError(403, "FORBIDDEN", "Cannot remove the workspace owner.");
  }

  const currentCount = workspace.members ? workspace.members.length : workspace.memberIds.length;
  if (currentCount <= 1) {
    throw new AppError(400, "BAD_REQUEST", "Cannot remove the last member of a workspace.");
  }

  return workspaceRepo.removeMember(workspaceId, targetUserId);
}

module.exports = {
  listForUser,
  getById,
  create,
  patch,
  remove,
  addMember,
  updateMember,
  removeMember,
  // Re-export RBAC helpers for clean importing by other services
  ...rbacService,
};
