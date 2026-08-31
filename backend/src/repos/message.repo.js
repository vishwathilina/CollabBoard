const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function findById(id) {
  return getStore().messages.find((m) => m.id === id) || null;
}

function findByTask(taskId) {
  return getStore()
    .messages.filter((m) => m.taskId === taskId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function create({ taskId, authorId, text }) {
  const { messages } = getStore();
  const message = {
    id: nextId("message"),
    taskId,
    authorId,
    text,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  return message;
}

function remove(id) {
  const store = getStore();
  const idx = store.messages.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const [deleted] = store.messages.splice(idx, 1);
  return deleted;
}

module.exports = { findById, findByTask, create, remove };
