const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const workspaceRepo = require("../repos/workspace.repo");
const attachmentRepo = require("../repos/attachment.repo");

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

function listAttachments(taskId, requesterId) {
  assertTaskAndMembership(taskId, requesterId);
  return attachmentRepo.findByTask(taskId);
}

function createAttachment(taskId, { name, type, url }, requesterId) {
  assertTaskAndMembership(taskId, requesterId);
  return attachmentRepo.create({ taskId, name, type, url, addedBy: requesterId });
}

function deleteAttachment(attachmentId, requesterId) {
  const attachment = attachmentRepo.findById(attachmentId);
  if (!attachment) {
    throw new AppError(404, "NOT_FOUND", `Attachment '${attachmentId}' was not found.`);
  }
  const task = taskRepo.findById(attachment.taskId);
  if (task) {
    const workspace = workspaceRepo.findById(task.workspaceId);
    if (workspace && !workspace.memberIds.includes(requesterId)) {
      throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
    }
  }
  if (attachment.addedBy !== requesterId) {
    throw new AppError(403, "FORBIDDEN", "Only the uploader can delete this attachment.");
  }
  attachmentRepo.remove(attachmentId);
  return { id: attachmentId, deleted: true };
}

module.exports = { listAttachments, createAttachment, deleteAttachment };
