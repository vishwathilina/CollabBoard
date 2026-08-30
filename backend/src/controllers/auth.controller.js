const { sendSuccess } = require("../utils/apiResponse");
const authService = require("../services/auth.service");

async function register(req, res) {
  const { name, email, password, avatarColor } = req.body;
  const result = await authService.register({ name, email, password, avatarColor });
  return sendSuccess(res, result, 201);
}

async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  return sendSuccess(res, result, 200);
}

async function me(req, res) {
  const user = authService.getMe(req.user.id);
  return sendSuccess(res, { user }, 200);
}

async function logout(req, res) {
  // Stateless JWT: client discards token. Optional deny-list not implemented (see auth.middleware.js comment).
  return sendSuccess(res, { loggedOut: true }, 200);
}

module.exports = { register, login, me, logout };
