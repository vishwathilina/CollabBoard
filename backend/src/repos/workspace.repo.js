const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function findById(id) {
  const { workspaces } = getStore();
  return workspaces.find((w) => w.id === id) || null;
}

function findAll() {
  return getStore().workspaces;
}

function findByMember(userId) {
  return getStore().workspaces.filter((w) => w.memberIds.includes(userId));
}

function create({ name, description, color, creatorId }) {
  const { workspaces } = getStore();
  const workspace = {
    id: nextId("workspace"),
    name,
    description,
    color,
    memberIds: [creatorId],
  };
  workspaces.push(workspace);
  return workspace;
}

function update(id, patch) {
  const workspace = findById(id);
  if (!workspace) return null;
  if (patch.name !== undefined) workspace.name = patch.name;
  if (patch.description !== undefined) workspace.description = patch.description;
  if (patch.color !== undefined) workspace.color = patch.color;
  return workspace;
}

function addMember(workspaceId, userId) {
  const workspace = findById(workspaceId);
  if (!workspace) return null;
  if (!workspace.memberIds.includes(userId)) {
    workspace.memberIds.push(userId);
  }
  return workspace;
}

function removeMember(workspaceId, userId) {
  const workspace = findById(workspaceId);
  if (!workspace) return null;
  workspace.memberIds = workspace.memberIds.filter((id) => id !== userId);
  return workspace;
}

function remove(workspaceId) {
  const store = getStore();
  const idx = store.workspaces.findIndex((w) => w.id === workspaceId);
  if (idx === -1) return null;
  const [deleted] = store.workspaces.splice(idx, 1);

  // Cascade: treeNodes, tasks, messages, attachments
  const remainingTaskIds = new Set();
  // Collect taskIds that belong to this workspace before deleting tasks
  const taskIdsToDelete = store.tasks.filter((t) => t.workspaceId === workspaceId).map((t) => t.id);
  const taskIdSet = new Set(taskIdsToDelete);

  // Remove tree nodes
  store.treeNodes = store.treeNodes.filter((n) => n.workspaceId !== workspaceId);
  // Remove tasks
  store.tasks = store.tasks.filter((t) => t.workspaceId !== workspaceId);
  // Remove messages and attachments of those tasks
  store.messages = store.messages.filter((m) => !taskIdSet.has(m.taskId));
  store.attachments = store.attachments.filter((a) => !taskIdSet.has(a.taskId));

  return deleted;
}

module.exports = {
  findById,
  findAll,
  findByMember,
  create,
  update,
  addMember,
  removeMember,
  remove,
};
