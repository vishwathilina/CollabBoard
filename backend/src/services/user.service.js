const { AppError } = require("../utils/AppError");
const userRepo = require("../repos/user.repo");

async function listUsers() {
  return await userRepo.findAllPublic();
}

async function getUserById(id) {
  const user = await userRepo.findById(id);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", `User '${id}' was not found.`);
  }
  return userRepo.toPublic(user);
}

async function updateMe(id, data) {
  const user = await userRepo.findById(id);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", `User '${id}' was not found.`);
  }
  
  const updatedUser = await userRepo.update(id, data);
  return userRepo.toPublic(updatedUser);
}

module.exports = { listUsers, getUserById, updateMe };
