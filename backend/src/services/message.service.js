const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const workspaceRepo = require("../repos/workspace.repo");
const messageRepo = require("../repos/message.repo");
const { eventBus } = require("../utils/eventBus");

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
  return { task, workspace };
}

async function listMessages(taskId, requesterId) {
  await assertTaskAndMembership(taskId, requesterId);
  return await messageRepo.findByTask(taskId);
}

async function createMessage(taskId, { text }, requesterId) {
  const { task } = await assertTaskAndMembership(taskId, requesterId);
  const uid = typeof requesterId === "object" ? (requesterId.id || requesterId._id) : requesterId;
  const message = await messageRepo.create({ taskId, authorId: uid, text });

  // Optional eventBus notification for Member 7 (Socket.io)
  eventBus.emit("comment:message", {
    taskId,
    workspaceId: task.workspaceId,
    message,
    authorId: uid,
  });

  return message;
}

async function deleteMessage(messageId, requesterId) {
  const message = await messageRepo.findById(messageId);
  if (!message) {
    throw new AppError(404, "NOT_FOUND", `Message '${messageId}' was not found.`);
  }
  const uid = typeof requesterId === "object" ? (requesterId.id || requesterId._id) : requesterId;

  // Verify that requester is the author
  if (message.authorId !== uid) {
    throw new AppError(403, "FORBIDDEN", "Only the author can delete this message.");
  }

  // Also verify membership of underlying task workspace if task still exists
  const task = await taskRepo.findById(message.taskId);
  if (task) {
    const workspace = await workspaceRepo.findById(task.workspaceId);
    const isSeniorPM = typeof requesterId === "object" && (requesterId.orgRole === "senior_project_manager" || requesterId.orgRole === "admin");
    const wsMemberIds = workspace ? (workspace.memberIds || (workspace.members || []).map((m) => m.userId)) : [];

    if (workspace && !isSeniorPM && !wsMemberIds.includes(uid) && workspace.ownerId !== uid) {
      throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
    }
  }

  await messageRepo.remove(messageId);
  return { id: messageId, deleted: true };
}

module.exports = { listMessages, createMessage, deleteMessage, eventBus };
