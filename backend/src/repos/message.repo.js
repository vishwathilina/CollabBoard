const mongoose = require("mongoose");
const { Message } = require("../models/Message");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function findById(id) {
  if (isMongoConnected()) {
    return Message.findById(id).then(docToRecord);
  }
  return Promise.resolve(getStore().messages.find((m) => m.id === id) || null);
}

function findByTask(taskId) {
  if (isMongoConnected()) {
    return Message.find({ taskId })
      .sort({ createdAt: 1 })
      .then((docs) => docs.map(docToRecord));
  }
  const messages = getStore()
    .messages.filter((m) => m.taskId === taskId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return Promise.resolve(messages);
}

async function create({ taskId, authorId, text }) {
  const id = await nextId("message");
  const createdAt = new Date();

  if (isMongoConnected()) {
    const doc = await Message.create({
      _id: id,
      taskId,
      authorId,
      text,
      createdAt,
    });
    return docToRecord(doc);
  }

  const { messages } = getStore();
  const message = {
    id,
    taskId,
    authorId,
    text,
    createdAt: createdAt.toISOString(),
  };
  messages.push(message);
  return message;
}

async function remove(id) {
  if (isMongoConnected()) {
    const doc = await Message.findByIdAndDelete(id);
    return docToRecord(doc);
  }

  const store = getStore();
  const idx = store.messages.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const [deleted] = store.messages.splice(idx, 1);
  return deleted;
}

module.exports = { findById, findByTask, create, remove };
