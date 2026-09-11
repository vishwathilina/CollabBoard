const seed = require("./seed");
const bcrypt = require("bcryptjs");

// Deep clone helper to prevent seed mutation leaking into store
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensurePasswordHashes(users) {
  for (const user of users) {
    // If already hashed (and no plain), keep it
    if (user.passwordHash && !user.passwordPlain) continue;
    // Determine plain to hash: passwordPlain or fallback demo password
    const plain = user.passwordPlain || "CollabBoard!1";
    // Only hash if missing hash
    if (!user.passwordHash) {
      user.passwordHash = bcrypt.hashSync(plain, 10);
    }
    // Always strip plaintext from memory
    if (user.passwordPlain) delete user.passwordPlain;
    if (user.password) delete user.password;
  }
}

let store = {
  users: [],
  workspaces: [],
  treeNodes: [],
  tasks: [],
  messages: [],
  attachments: [],
  workspaceChatMessages: [],
};

function assignTaskOrders(tasks) {
  const counters = new Map();
  return tasks.map((task) => {
    const key = `${task.workspaceId}:${task.column}`;
    const order = typeof task.order === "number" ? task.order : (counters.get(key) || 0);
    counters.set(key, order + 1);
    return { ...task, order, version: task.version ?? 1 };
  });
}

function loadSeed() {
  store.users = clone(seed.users);
  ensurePasswordHashes(store.users);
  store.workspaces = clone(seed.workspaces);
  store.treeNodes = clone(seed.treeNodes);
  store.tasks = assignTaskOrders(clone(seed.tasks));
  store.messages = clone(seed.messages);
  store.attachments = clone(seed.attachments);
  store.workspaceChatMessages = seed.workspaceChatMessages ? clone(seed.workspaceChatMessages) : [];
}

// Initial load
loadSeed();

function getStore() {
  return store;
}

function reset() {
  loadSeed();
}

module.exports = { getStore, reset, store };
