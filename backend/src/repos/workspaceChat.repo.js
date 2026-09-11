const mongoose = require("mongoose");
const { WorkspaceChatMessage } = require("../models/WorkspaceChatMessage");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function findById(id) {
  if (isMongoConnected()) {
    return WorkspaceChatMessage.findById(id).then(docToRecord);
  }
  const messages = getStore().workspaceChatMessages || [];
  return Promise.resolve(messages.find((m) => m.id === id) || null);
}

function findByWorkspace(workspaceId, { limit = 50 } = {}) {
  const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
  if (isMongoConnected()) {
    return WorkspaceChatMessage.find({ workspaceId })
      .sort({ createdAt: 1 })
      .limit(numericLimit)
      .then((docs) => docs.map(docToRecord));
  }
  const messages = (getStore().workspaceChatMessages || [])
    .filter((m) => m.workspaceId === workspaceId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-numericLimit);
  return Promise.resolve(messages);
}

async function create({ workspaceId, authorId, text }) {
  const id = nextId("chat");
  const createdAt = new Date();

  if (isMongoConnected()) {
    const doc = await WorkspaceChatMessage.create({
      _id: id,
      workspaceId,
      authorId,
      text,
      createdAt,
    });
    return docToRecord(doc);
  }

  const store = getStore();
  if (!store.workspaceChatMessages) {
    store.workspaceChatMessages = [];
  }
  const message = {
    id,
    workspaceId,
    authorId,
    text,
    createdAt: createdAt.toISOString(),
  };
  store.workspaceChatMessages.push(message);
  return message;
}

module.exports = {
  findById,
  findByWorkspace,
  create,
};
