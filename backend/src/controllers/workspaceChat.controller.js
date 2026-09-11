const { sendSuccess } = require("../utils/apiResponse");
const workspaceChatService = require("../services/workspaceChat.service");

async function listChat(req, res) {
  const { id } = req.params;
  const { limit } = req.query;
  const messages = await workspaceChatService.listMessages(id, req.user, { limit });
  return sendSuccess(res, messages, 200, { count: messages.length });
}

async function postChat(req, res) {
  const { id } = req.params;
  const { text } = req.body;
  const message = await workspaceChatService.createMessage(id, { text }, req.user);
  return sendSuccess(res, message, 201);
}

module.exports = {
  listChat,
  postChat,
};
