const { sendSuccess } = require("../utils/apiResponse");
const userService = require("../services/user.service");

function listUsers(req, res) {
  const users = userService.listUsers();
  return sendSuccess(res, users, 200, { count: users.length });
}

function getUserById(req, res) {
  const { id } = req.params;
  const user = userService.getUserById(id);
  return sendSuccess(res, user, 200);
}

module.exports = { listUsers, getUserById };
