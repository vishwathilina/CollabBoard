const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function toPublic(user) {
  if (!user) return null;
  const { id, name, avatarColor, email } = user;
  return { id, name, avatarColor, email };
}

function findById(id) {
  const { users } = getStore();
  return users.find((u) => u.id === id) || null;
}

function findByEmail(email) {
  const { users } = getStore();
  const normalized = email.toLowerCase();
  return users.find((u) => u.email && u.email.toLowerCase() === normalized) || null;
}

function findAll() {
  return getStore().users;
}

function findAllPublic() {
  return findAll().map(toPublic);
}

function create({ name, email, passwordHash, avatarColor }) {
  const { users } = getStore();
  const user = {
    id: nextId("user"),
    name,
    email: email.toLowerCase(),
    passwordHash,
    avatarColor: avatarColor || "#C6F135",
  };
  users.push(user);
  return user;
}

module.exports = {
  toPublic,
  findById,
  findByEmail,
  findAll,
  findAllPublic,
  create,
};
