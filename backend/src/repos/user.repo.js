const { User } = require("../models/User");
const { docToRecord } = require("./serialize");

function toPublic(user) {
  if (!user) return null;
  const doc = docToRecord(user);
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    avatarColor: doc.avatarColor,
    orgRole: doc.orgRole,
    title: doc.title,
    bio: doc.bio,
    avatarUrl: doc.avatarUrl,
  };
}

async function findById(id) {
  const user = await User.findById(id);
  return docToRecord(user);
}

async function findByEmail(email) {
  const normalized = email.toLowerCase();
  const user = await User.findOne({ email: normalized });
  return docToRecord(user);
}

async function findAll() {
  const users = await User.find();
  return users.map(docToRecord);
}

async function findAllPublic() {
  const users = await User.find();
  return users.map(docToRecord).map(toPublic);
}

async function create({ name, email, passwordHash, avatarColor }) {
  const normalized = email.toLowerCase();
  const user = await User.create({
    _id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    email: normalized,
    passwordHash,
    avatarColor: avatarColor || "#C6F135",
  });
  return docToRecord(user);
}

async function update(id, data) {
  const user = await User.findByIdAndUpdate(id, data, { new: true });
  return docToRecord(user);
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
