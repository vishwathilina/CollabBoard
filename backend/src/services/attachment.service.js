const { AppError } = require("../utils/AppError");
const taskRepo = require("../repos/task.repo");
const workspaceRepo = require("../repos/workspace.repo");
const attachmentRepo = require("../repos/attachment.repo");

async function assertTaskAndMembership(taskId, requester) {
  const task = await taskRepo.findById(taskId);
  if (!task) {
    throw new AppError(404, "NOT_FOUND", `Task '${taskId}' was not found.`);
  }
  const workspace = await workspaceRepo.findById(task.workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${task.workspaceId}' was not found.`);
  }

  const uid = typeof requester === "object" ? (requester.id || requester._id) : requester;
  const isSeniorPM =
    typeof requester === "object" &&
    (requester.orgRole === "senior_project_manager" || requester.orgRole === "admin");
  const wsMemberIds = workspace.memberIds || (workspace.members || []).map((m) => m.userId);

  if (!isSeniorPM && !wsMemberIds.includes(uid) && workspace.ownerId !== uid) {
    throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
  }
  return { task, workspace };
}

async function listAttachments(taskId, requester) {
  await assertTaskAndMembership(taskId, requester);
  return await attachmentRepo.findByTask(taskId);
}

async function createAttachment(taskId, { name, type, url, fileKey }, requester) {
  await assertTaskAndMembership(taskId, requester);
  const uid = typeof requester === "object" ? (requester.id || requester._id) : requester;
  return await attachmentRepo.create({
    taskId,
    name,
    type,
    url,
    fileKey: fileKey || null,
    addedBy: uid,
  });
}

async function deleteAttachment(attachmentId, requester) {
  const attachment = await attachmentRepo.findById(attachmentId);
  if (!attachment) {
    throw new AppError(404, "NOT_FOUND", `Attachment '${attachmentId}' was not found.`);
  }
  const uid = typeof requester === "object" ? (requester.id || requester._id) : requester;
  const isSeniorPM =
    typeof requester === "object" &&
    (requester.orgRole === "senior_project_manager" || requester.orgRole === "admin");

  const task = await taskRepo.findById(attachment.taskId);
  if (task) {
    const workspace = await workspaceRepo.findById(task.workspaceId);
    const wsMemberIds = workspace
      ? workspace.memberIds || (workspace.members || []).map((m) => m.userId)
      : [];
    if (workspace && !isSeniorPM && !wsMemberIds.includes(uid) && workspace.ownerId !== uid) {
      throw new AppError(403, "FORBIDDEN", "You are not a member of this workspace.");
    }
  }

  if (attachment.addedBy !== uid && !isSeniorPM) {
    throw new AppError(403, "FORBIDDEN", "Only the uploader can delete this attachment.");
  }

  // Optional: Clean up file on UploadThing server if fileKey and token exist
  if (attachment.fileKey && process.env.UPLOADTHING_TOKEN) {
    try {
      const { UTApi } = require("uploadthing/server");
      const utapi = new UTApi();
      await utapi.deleteFiles(attachment.fileKey);
    } catch (err) {
      console.warn("UploadThing deleteFiles non-fatal error:", err.message);
    }
  }

  await attachmentRepo.remove(attachmentId);
  return { id: attachmentId, deleted: true };
}

module.exports = { listAttachments, createAttachment, deleteAttachment };
