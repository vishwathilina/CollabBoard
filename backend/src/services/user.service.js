const { AppError } = require("../utils/AppError");
const userRepo = require("../repos/user.repo");

function listUsers() {
  return userRepo.findAllPublic();
}

function getUserById(id) {
  const user = userRepo.findById(id);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", `User '${id}' was not found.`);
  }
  return userRepo.toPublic(user);
}

module.exports = { listUsers, getUserById };
