const seed = require("./seed");

// Deep clone helper to prevent seed mutation leaking into store
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

let store = {
  users: [],
  workspaces: [],
  treeNodes: [],
  tasks: [],
  messages: [],
  attachments: [],
};

function loadSeed() {
  store.users = clone(seed.users);
  store.workspaces = clone(seed.workspaces);
  store.treeNodes = clone(seed.treeNodes);
  store.tasks = clone(seed.tasks);
  store.messages = clone(seed.messages);
  store.attachments = clone(seed.attachments);
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
