const { AppError } = require("../utils/AppError");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");

function listForUser(userId) {
  return workspaceRepo.findByMember(userId);
}

function getById(workspaceId, requesterId) {
  const workspace = workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return workspace;
}

function create({ name, description, color }, creatorId) {
  // creatorId already validated via protect
  return workspaceRepo.create({ name, description, color, creatorId });
}

function patch(workspaceId, patchData, requesterId) {
  const workspace = workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return workspaceRepo.update(workspaceId, patchData);
}

function remove(workspaceId, requesterId) {
  const workspace = workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return workspaceRepo.remove(workspaceId);
}

function addMember(workspaceId, userId, requesterId) {
  const workspace = workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  const user = userRepo.findById(userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", `User '${userId}' was not found.`);
  }
  if (workspace.memberIds.includes(userId)) {
    throw new AppError(409, "CONFLICT", `User '${userId}' is already a member.`);
  }
  return workspaceRepo.addMember(workspaceId, userId);
}

function removeMember(workspaceId, userId, requesterId) {
  const workspace = workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  if (!workspace.memberIds.includes(userId)) {
    throw new AppError(404, "NOT_FOUND", `User '${userId}' is not a member of this workspace.`);
  }
  if (workspace.memberIds.length === 1) {
    throw new AppError(400, "BAD_REQUEST", "Cannot remove the last member of a workspace.");
  }
  return workspaceRepo.removeMember(workspaceId, userId);
}

module.exports = {
  listForUser,
  getById,
  create,
  patch,
  remove,
  addMember,
  removeMember,
};
