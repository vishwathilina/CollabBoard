const { sendSuccess } = require("../utils/apiResponse");
const messageService = require("../services/message.service");

async function listMessages(req, res) {
  const { taskId } = req.params;
  const messages = await messageService.listMessages(taskId, req.user);
  return sendSuccess(res, messages, 200, { count: messages.length });
}

async function createMessage(req, res) {
  const { taskId } = req.params;
  const { text } = req.body;
  const message = await messageService.createMessage(taskId, { text }, req.user);
  return sendSuccess(res, message, 201);
}

async function deleteMessage(req, res) {
  const { messageId } = req.params;
  const result = await messageService.deleteMessage(messageId, req.user);
  return sendSuccess(res, result, 200);
}

module.exports = { listMessages, createMessage, deleteMessage };
