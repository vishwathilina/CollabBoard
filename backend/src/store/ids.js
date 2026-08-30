const { getStore } = require("./memory.store");

const prefixMap = {
  user: "u",
  workspace: "ws",
  treeNode: "tn",
  task: "task",
  message: "msg",
  attachment: "att",
};

/**
 * Generate next sequential id for a given collection.
 * Looks at existing ids, finds max numeric suffix, increments.
 * Falls back to Date.now() if no numeric suffix found.
 *
 * @param {string} type - one of user|workspace|treeNode|task|message|attachment
 * @returns {string}
 */
function nextId(type) {
  const store = getStore();
  const prefix = prefixMap[type];
  if (!prefix) throw new Error(`Unknown id type: ${type}`);

  const collectionMap = {
    user: store.users,
    workspace: store.workspaces,
    treeNode: store.treeNodes,
    task: store.tasks,
    message: store.messages,
    attachment: store.attachments,
  };

  const collection = collectionMap[type];
  if (!collection || collection.length === 0) {
    return `${prefix}-${type === "task" || type === "message" || type === "attachment" ? "01" : "01"}`;
  }

  let max = 0;
  let hasNumeric = false;
  for (const item of collection) {
    if (!item.id || !item.id.startsWith(`${prefix}-`)) continue;
    const suffix = item.id.slice(prefix.length + 1);
    // suffix may be like "01" or "website" - try parse int portion
    // For ids like ws-website, numeric parse fails; skip those for increment but track numeric ones
    const num = parseInt(suffix, 10);
    if (!Number.isNaN(num)) {
      hasNumeric = true;
      if (num > max) max = num;
    }
  }

  if (!hasNumeric) {
    // No numeric ids, use count+1 with zero pad 2
    const next = collection.length + 1;
    return `${prefix}-${String(next).padStart(2, "0")}`;
  }

  const next = max + 1;
  // preserve zero padding to 2 digits for numeric ids; tasks/messages/attachments traditionally 2 digits
  const pad = next < 100 ? 2 : 0;
  return pad ? `${prefix}-${String(next).padStart(pad, "0")}` : `${prefix}-${next}`;
}

module.exports = { nextId, prefixMap };
