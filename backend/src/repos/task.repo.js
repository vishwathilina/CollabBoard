const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function findById(id) {
  const { tasks } = getStore();
  return tasks.find((t) => t.id === id) || null;
}

function findByWorkspace(workspaceId, filters = {}) {
  const { treeNode, column } = filters;
  return getStore().tasks.filter((t) => {
    if (t.workspaceId !== workspaceId) return false;
    if (treeNode && t.treeNodeId !== treeNode) return false;
    if (column && t.column !== column) return false;
    return true;
  });
}

function create(fields) {
  const { tasks } = getStore();
  const task = {
    id: nextId("task"),
    workspaceId: fields.workspaceId,
    treeNodeId: fields.treeNodeId,
    column: fields.column,
    title: fields.title,
    description: fields.description ?? "",
    priority: fields.priority,
    memberIds: fields.memberIds ?? [],
    startDate: fields.startDate,
    dueDate: fields.dueDate,
    completion: fields.completion ?? 0,
    version: 1,
  };
  tasks.push(task);
  return task;
}

function update(id, patch) {
  const task = findById(id);
  if (!task) return null;

  const allowed = [
    "treeNodeId",
    "column",
    "title",
    "description",
    "priority",
    "memberIds",
    "startDate",
    "dueDate",
    "completion",
    "version",
  ];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      task[key] = patch[key];
    }
  }
  return task;
}

function remove(id) {
  const store = getStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const [deleted] = store.tasks.splice(idx, 1);
  store.messages = store.messages.filter((m) => m.taskId !== id);
  store.attachments = store.attachments.filter((a) => a.taskId !== id);
  return deleted;
}

module.exports = {
  findById,
  findByWorkspace,
  create,
  update,
  remove,
};
