const { sendSuccess } = require("../utils/apiResponse");
const userService = require("../services/user.service");

async function listUsers(req, res) {
  const users = await userService.listUsers();
  return sendSuccess(res, users, 200, { count: users.length });
}

async function getUserById(req, res) {
  const { id } = req.params;
  const user = await userService.getUserById(id);
  return sendSuccess(res, user, 200);
}

async function updateMe(req, res) {
  const { name, avatarColor, title, bio, avatarUrl } = req.body;
  const updated = await userService.updateMe(req.user.id, { name, avatarColor, title, bio, avatarUrl });
  return sendSuccess(res, updated, 200);
}

module.exports = { listUsers, getUserById, updateMe };
