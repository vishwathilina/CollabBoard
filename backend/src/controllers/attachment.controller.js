const { sendSuccess } = require("../utils/apiResponse");
const attachmentService = require("../services/attachment.service");

function listAttachments(req, res) {
  const { taskId } = req.params;
  const attachments = attachmentService.listAttachments(taskId, req.user.id);
  return sendSuccess(res, attachments, 200, { count: attachments.length });
}

function createAttachment(req, res) {
  const { taskId } = req.params;
  const { name, type, url } = req.body;
  const attachment = attachmentService.createAttachment(taskId, { name, type, url }, req.user.id);
  return sendSuccess(res, attachment, 201);
}

function deleteAttachment(req, res) {
  const { attachmentId } = req.params;
  const result = attachmentService.deleteAttachment(attachmentId, req.user.id);
  return sendSuccess(res, result, 200);
}

module.exports = { listAttachments, createAttachment, deleteAttachment };
