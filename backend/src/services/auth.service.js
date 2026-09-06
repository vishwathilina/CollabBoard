const bcrypt = require("bcryptjs");
const { AppError } = require("../utils/AppError");
const userRepo = require("../repos/user.repo");
const { signToken, EXPIRES_IN } = require("../utils/tokens");

async function register({ name, email, password, avatarColor }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await userRepo.findByEmail(normalizedEmail);
  if (existing) {
    throw new AppError(409, "CONFLICT", `Email '${normalizedEmail}' is already registered.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepo.create({
    name,
    email: normalizedEmail,
    passwordHash,
    avatarColor: avatarColor || "#C6F135",
  });

  const publicUser = userRepo.toPublic(user);
  const token = signToken({ sub: user.id, email: user.email, name: user.name });

  return { user: publicUser, token, expiresIn: EXPIRES_IN };
}

async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase();
  const user = await userRepo.findByEmail(normalizedEmail);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password.");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password.");
  }

  const publicUser = userRepo.toPublic(user);
  const token = signToken({ sub: user.id, email: user.email, name: user.name });

  return { user: publicUser, token, expiresIn: EXPIRES_IN };
}

async function getMe(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", `User '${userId}' was not found.`);
  }
  return userRepo.toPublic(user);
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found.");
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw new AppError(400, "BAD_REQUEST", "Incorrect current password.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepo.update(userId, { passwordHash });

  return { success: true };
}

module.exports = { register, login, getMe, changePassword };
