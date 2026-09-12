const mongoose = require("mongoose");
const { getStore } = require("./memory.store");

const prefixMap = {
  user: "u",
  workspace: "ws",
  treeNode: "tn",
  task: "task",
  message: "msg",
  attachment: "att",
  chat: "chat",
};

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function modelFor(type) {
  // Lazy require avoids circular deps at module load
  const models = require("../models");
  const map = {
    user: models.User,
    workspace: models.Workspace,
    treeNode: models.TreeNode,
    task: models.Task,
    message: models.Message,
    attachment: models.Attachment,
    chat: models.WorkspaceChatMessage,
  };
  return map[type];
}

function pickId(item) {
  if (!item) return null;
  if (typeof item === "string") return item;
  return item.id || item._id || null;
}

function computeNextId(prefix, ids, fallbackCount) {
  let max = 0;
  let hasNumeric = false;

  for (const raw of ids) {
    const id = pickId(raw);
    if (!id || typeof id !== "string" || !id.startsWith(`${prefix}-`)) continue;
    const suffix = id.slice(prefix.length + 1);
    // suffix may be like "01" or "website" — only count pure numeric suffixes
    if (!/^\d+$/.test(suffix)) continue;
    const num = parseInt(suffix, 10);
    hasNumeric = true;
    if (num > max) max = num;
  }

  if (!hasNumeric) {
    const next = (fallbackCount || 0) + 1;
    return `${prefix}-${String(next).padStart(2, "0")}`;
  }

  const next = max + 1;
  const pad = next < 100 ? 2 : 0;
  return pad ? `${prefix}-${String(next).padStart(pad, "0")}` : `${prefix}-${next}`;
}

/**
 * Generate next sequential id for a given collection.
 * When MongoDB is connected, scans persisted _ids so creates do not collide
 * with documents already in the database (memory store is not kept in sync).
 *
 * @param {string} type - one of user|workspace|treeNode|task|message|attachment|chat
 * @returns {Promise<string>}
 */
async function nextId(type) {
  const prefix = prefixMap[type];
  if (!prefix) throw new Error(`Unknown id type: ${type}`);

  if (isMongoConnected()) {
    const Model = modelFor(type);
    if (!Model) throw new Error(`No model for id type: ${type}`);
    const docs = await Model.find({}, { _id: 1 }).lean();
    const ids = docs.map((d) => String(d._id));
    return computeNextId(prefix, ids, ids.length);
  }

  const store = getStore();
  const collectionMap = {
    user: store.users,
    workspace: store.workspaces,
    treeNode: store.treeNodes,
    task: store.tasks,
    message: store.messages,
    attachment: store.attachments,
    chat: store.workspaceChatMessages,
  };

  const collection = collectionMap[type] || [];
  return computeNextId(
    prefix,
    collection.map((item) => item.id),
    collection.length
  );
}

module.exports = { nextId, prefixMap };
