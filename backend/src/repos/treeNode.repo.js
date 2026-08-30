const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function findById(id) {
  const { treeNodes } = getStore();
  return treeNodes.find((n) => n.id === id) || null;
}

function findByWorkspace(workspaceId) {
  return getStore().treeNodes.filter((n) => n.workspaceId === workspaceId);
}

function findChildren(parentId) {
  return getStore().treeNodes.filter((n) => n.parentId === parentId);
}

function hasChildren(nodeId) {
  return getStore().treeNodes.some((n) => n.parentId === nodeId);
}

function hasTasks(nodeId) {
  return getStore().tasks.some((t) => t.treeNodeId === nodeId);
}

/**
 * Collect all descendant ids recursively (BFS) for a given node.
 * Does NOT include the node itself.
 */
function getDescendantIds(nodeId) {
  const { treeNodes } = getStore();
  const descendants = new Set();
  const stack = [nodeId];
  const visited = new Set();
  visited.add(nodeId);
  while (stack.length) {
    const current = stack.pop();
    for (const node of treeNodes) {
      if (node.parentId === current && !visited.has(node.id)) {
        descendants.add(node.id);
        visited.add(node.id);
        stack.push(node.id);
      }
    }
  }
  return descendants;
}

function create({ workspaceId, parentId, name, completion }) {
  const { treeNodes } = getStore();
  const node = {
    id: nextId("treeNode"),
    workspaceId,
    parentId: parentId === undefined ? null : parentId,
    name,
    completion: completion !== undefined ? completion : 0,
  };
  treeNodes.push(node);
  return node;
}

function update(id, patch) {
  const node = findById(id);
  if (!node) return null;
  if (patch.name !== undefined) node.name = patch.name;
  if (patch.parentId !== undefined) node.parentId = patch.parentId;
  if (patch.completion !== undefined) node.completion = patch.completion;
  return node;
}

function remove(id) {
  const store = getStore();
  const idx = store.treeNodes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const [deleted] = store.treeNodes.splice(idx, 1);
  return deleted;
}

module.exports = {
  findById,
  findByWorkspace,
  findChildren,
  hasChildren,
  hasTasks,
  getDescendantIds,
  create,
  update,
  remove,
};
