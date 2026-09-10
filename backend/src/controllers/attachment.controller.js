const { sendSuccess } = require("../utils/apiResponse");
const attachmentService = require("../services/attachment.service");

async function listAttachments(req, res) {
  const { taskId } = req.params;
  const attachments = await attachmentService.listAttachments(taskId, req.user);
  return sendSuccess(res, attachments, 200, { count: attachments.length });
}

async function createAttachment(req, res) {
  const { taskId } = req.params;
  const { name, type, url, fileKey } = req.body;
  const attachment = await attachmentService.createAttachment(
    taskId,
    { name, type, url, fileKey },
    req.user
  );
  return sendSuccess(res, attachment, 201);
}

async function deleteAttachment(req, res) {
  const { attachmentId } = req.params;
  const result = await attachmentService.deleteAttachment(attachmentId, req.user);
  return sendSuccess(res, result, 200);
}

module.exports = { listAttachments, createAttachment, deleteAttachment };
