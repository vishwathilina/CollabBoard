const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function findById(id) {
  return getStore().attachments.find((a) => a.id === id) || null;
}

function findByTask(taskId) {
  return getStore().attachments.filter((a) => a.taskId === taskId);
}

function create({ taskId, name, type, url, addedBy }) {
  const { attachments } = getStore();
  const attachment = {
    id: nextId("attachment"),
    taskId,
    name,
    type,
    url,
    addedBy,
  };
  attachments.push(attachment);
  return attachment;
}

function remove(id) {
  const store = getStore();
  const idx = store.attachments.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const [deleted] = store.attachments.splice(idx, 1);
  return deleted;
}

module.exports = { findById, findByTask, create, remove };
