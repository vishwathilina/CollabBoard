const { sendSuccess } = require("../utils/apiResponse");
const messageService = require("../services/message.service");

function listMessages(req, res) {
  const { taskId } = req.params;
  const messages = messageService.listMessages(taskId, req.user.id);
  return sendSuccess(res, messages, 200, { count: messages.length });
}

function createMessage(req, res) {
  const { taskId } = req.params;
  const { text } = req.body;
  const message = messageService.createMessage(taskId, { text }, req.user.id);
  return sendSuccess(res, message, 201);
}

function deleteMessage(req, res) {
  const { messageId } = req.params;
  const result = messageService.deleteMessage(messageId, req.user.id);
  return sendSuccess(res, result, 200);
}

module.exports = { listMessages, createMessage, deleteMessage };
