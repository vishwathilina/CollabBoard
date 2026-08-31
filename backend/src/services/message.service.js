const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const workspaceRepo = require("../repos/workspace.repo");
const messageRepo = require("../repos/message.repo");

function assertTaskAndMembership(taskId, requesterId) {
  const task = taskRepo.findById(taskId);
  if (!task) {
    throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
  }
  const workspace = workspaceRepo.findById(task.workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${task.workspaceId}' was not found.`);
  }
  if (!workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return task;
}

function listMessages(taskId, requesterId) {
  assertTaskAndMembership(taskId, requesterId);
  return messageRepo.findByTask(taskId);
}

function createMessage(taskId, { text }, requesterId) {
  assertTaskAndMembership(taskId, requesterId);
  return messageRepo.create({ taskId, authorId: requesterId, text });
}

function deleteMessage(messageId, requesterId) {
  const message = messageRepo.findById(messageId);
  if (!message) {
    throw new AppError(404, "NOT_FOUND", `Message '${messageId}' was not found.`);
  }
  // Need to verify membership of underlying task workspace as well
  const task = taskRepo.findById(message.taskId);
  if (!task) {
    // Orphan message; just check author
    if (message.authorId !== requesterId) {
      throw new AppError(403, "FORBIDDEN", "Only the author can delete this message.");
    }
    messageRepo.remove(messageId);
    return { id: messageId, deleted: true };
  }
  const workspace = workspaceRepo.findById(task.workspaceId);
  if (workspace && !workspace.memberIds.includes(requesterId)) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  if (message.authorId !== requesterId) {
    throw new AppError(403, "FORBIDDEN", "Only the author can delete this message.");
  }
  messageRepo.remove(messageId);
  return { id: messageId, deleted: true };
}

module.exports = { listMessages, createMessage, deleteMessage };
