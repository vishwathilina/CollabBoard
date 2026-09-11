const mongoose = require("mongoose");
const { User } = require("../models/User");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function toPublic(user) {
  if (!user) return null;
  const doc = docToRecord(user);
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    avatarColor: doc.avatarColor,
    orgRole: doc.orgRole || "developer",
    title: doc.title,
    bio: doc.bio,
    avatarUrl: doc.avatarUrl,
  };
}

async function findById(id) {
  if (isMongoConnected()) {
    const user = await User.findById(id);
    if (!user) return null;
    const record = docToRecord(user);
    if (user.passwordHash) {
      record.passwordHash = user.passwordHash;
    }
    return record;
  }
  const user = getStore().users.find((u) => u.id === id);
  return user ? { ...user } : null;
}

async function findByEmail(email) {
  const normalized = email.toLowerCase();
  if (isMongoConnected()) {
    const user = await User.findOne({ email: normalized });
    if (!user) return null;
    const record = docToRecord(user);
    if (user.passwordHash) {
      record.passwordHash = user.passwordHash;
    }
    return record;
  }
  const user = getStore().users.find((u) => u.email.toLowerCase() === normalized);
  return user ? { ...user } : null;
}

async function findAll() {
  if (isMongoConnected()) {
    const users = await User.find();
    return users.map(docToRecord);
  }
  return getStore().users.map((u) => ({ ...u }));
}

async function findAllPublic() {
  if (isMongoConnected()) {
    const users = await User.find();
    return users.map(docToRecord).map(toPublic);
  }
  return getStore().users.map(toPublic);
}

async function create({ name, email, passwordHash, avatarColor, orgRole }) {
  const normalized = email.toLowerCase();
  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (isMongoConnected()) {
    const user = await User.create({
      _id: id,
      name,
      email: normalized,
      passwordHash,
      avatarColor: avatarColor || "#C6F135",
      orgRole: orgRole || "developer",
    });
    const record = docToRecord(user);
    if (user.passwordHash) {
      record.passwordHash = user.passwordHash;
    }
    return record;
  }
  const user = {
    id,
    name,
    email: normalized,
    passwordHash,
    avatarColor: avatarColor || "#C6F135",
    orgRole: orgRole || "developer",
    title: "",
    bio: "",
    avatarUrl: "",
  };
  getStore().users.push(user);
  return { ...user };
}

async function update(id, data) {
  if (isMongoConnected()) {
    const user = await User.findByIdAndUpdate(id, data, { new: true });
    return docToRecord(user);
  }
  const user = getStore().users.find((u) => u.id === id);
  if (!user) return null;
  Object.assign(user, data);
  return { ...user };
}

module.exports = {
  toPublic,
  findById,
  findByEmail,
  findAll,
  findAllPublic,
  create,
  update,
};
