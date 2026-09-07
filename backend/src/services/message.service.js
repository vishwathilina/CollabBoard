const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const workspaceRepo = require("../repos/workspace.repo");
const messageRepo = require("../repos/message.repo");

async function assertTaskAndMembership(taskId, requesterId) {
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
  }
  const workspace = await workspaceRepo.findById(task.workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${task.workspaceId}' was not found.`);
  }
  const uid = typeof requesterId === "object" ? (requesterId.id || requesterId._id) : requesterId;
  const isSeniorPM = typeof requesterId === "object" && (requesterId.orgRole === "senior_project_manager" || requesterId.orgRole === "admin");
  const wsMemberIds = workspace.memberIds || (workspace.members || []).map((m) => m.userId);

  if (!isSeniorPM && !wsMemberIds.includes(uid) && workspace.ownerId !== uid) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return task;
}

async function listMessages(taskId, requesterId) {
  await assertTaskAndMembership(taskId, requesterId);
  return messageRepo.findByTask(taskId);
}

async function createMessage(taskId, { text }, requesterId) {
  await assertTaskAndMembership(taskId, requesterId);
  const uid = typeof requesterId === "object" ? (requesterId.id || requesterId._id) : requesterId;
  return messageRepo.create({ taskId, authorId: uid, text });
}

async function deleteMessage(messageId, requesterId) {
  const message = messageRepo.findById(messageId);
  if (!message) {
    throw new AppError(404, "NOT_FOUND", `Message '${messageId}' was not found.`);
  }
  const uid = typeof requesterId === "object" ? (requesterId.id || requesterId._id) : requesterId;

  // Need to verify membership of underlying task workspace as well
  const task = await taskRepo.findById(message.taskId);
  if (!task) {
    if (message.authorId !== uid) {
      throw new AppError(403, "FORBIDDEN", "Only the author can delete this message.");
    }
    messageRepo.remove(messageId);
    return { id: messageId, deleted: true };
  }

  const workspace = await workspaceRepo.findById(task.workspaceId);
  const isSeniorPM = typeof requesterId === "object" && (requesterId.orgRole === "senior_project_manager" || requesterId.orgRole === "admin");
  const wsMemberIds = workspace ? (workspace.memberIds || (workspace.members || []).map((m) => m.userId)) : [];

  if (workspace && !isSeniorPM && !wsMemberIds.includes(uid) && workspace.ownerId !== uid) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  if (message.authorId !== uid) {
    throw new AppError(403, "FORBIDDEN", "Only the author can delete this message.");
  }
  messageRepo.remove(messageId);
  return { id: messageId, deleted: true };
}

module.exports = { listMessages, createMessage, deleteMessage };
