const mongoose = require("mongoose");
const { Attachment } = require("../models/Attachment");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function findById(id) {
  if (isMongoConnected()) {
    return Attachment.findById(id).then(docToRecord);
  }
  return Promise.resolve(
    getStore().attachments.find((a) => a.id === id) || null
  );
}

function findByTask(taskId) {
  if (isMongoConnected()) {
    return Attachment.find({ taskId })
      .sort({ createdAt: 1 })
      .then((docs) => docs.map(docToRecord));
  }
  return Promise.resolve(
    getStore().attachments.filter((a) => a.taskId === taskId)
  );
}

async function create({ taskId, name, type, url, fileKey = null, addedBy }) {
  const id = nextId("attachment");
  if (isMongoConnected()) {
    const doc = await Attachment.create({
      _id: id,
      taskId,
      name,
      type,
      url,
      fileKey,
      addedBy,
    });
    return docToRecord(doc);
  }

  const { attachments } = getStore();
  const attachment = {
    id,
    taskId,
    name,
    type,
    url,
    fileKey,
    addedBy,
    createdAt: new Date().toISOString(),
  };
  attachments.push(attachment);
  return attachment;
}

async function remove(id) {
  if (isMongoConnected()) {
    const doc = await Attachment.findByIdAndDelete(id);
    return docToRecord(doc);
  }

  const store = getStore();
  const idx = store.attachments.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const [deleted] = store.attachments.splice(idx, 1);
  return deleted;
}

module.exports = { findById, findByTask, create, remove };
