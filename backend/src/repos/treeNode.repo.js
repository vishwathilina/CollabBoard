const mongoose = require("mongoose");
const { TreeNode } = require("../models/TreeNode");
const { Task } = require("../models/Task");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

async function findById(id) {
  if (isMongoConnected()) {
    const node = await TreeNode.findById(id);
    return docToRecord(node);
  }
  const { treeNodes } = getStore();
  const found = treeNodes.find((n) => n.id === id);
  return found ? { ...found } : null;
}

async function findByWorkspace(workspaceId) {
  if (isMongoConnected()) {
    const nodes = await TreeNode.find({ workspaceId });
    return nodes.map(docToRecord);
  }
  return getStore().treeNodes
    .filter((n) => n.workspaceId === workspaceId)
    .map((n) => ({ ...n }));
}

async function findChildren(parentId) {
  if (isMongoConnected()) {
    const nodes = await TreeNode.find({ parentId });
    return nodes.map(docToRecord);
  }
  return getStore().treeNodes
    .filter((n) => n.parentId === parentId)
    .map((n) => ({ ...n }));
}

async function hasChildren(nodeId) {
  if (isMongoConnected()) {
    const count = await TreeNode.countDocuments({ parentId: nodeId });
    return count > 0;
  }
  return getStore().treeNodes.some((n) => n.parentId === nodeId);
}

async function hasTasks(nodeId) {
  if (isMongoConnected()) {
    const count = await Task.countDocuments({ treeNodeId: nodeId });
    return count > 0;
  }
  return getStore().tasks.some((t) => t.treeNodeId === nodeId);
}

/**
 * Collect all descendant ids recursively (BFS) for a given node.
 * Does NOT include the node itself.
 */
async function getDescendantIds(nodeId) {
  let allNodes = [];
  if (isMongoConnected()) {
    const target = await TreeNode.findById(nodeId);
    if (!target) return new Set();
    const nodes = await TreeNode.find({ workspaceId: target.workspaceId });
    allNodes = nodes.map(docToRecord);
  } else {
    allNodes = getStore().treeNodes;
  }

  const descendants = new Set();
  const stack = [nodeId];
  const visited = new Set();
  visited.add(nodeId);
  while (stack.length) {
    const current = stack.pop();
    for (const node of allNodes) {
      if (node.parentId === current && !visited.has(node.id)) {
        descendants.add(node.id);
        visited.add(node.id);
        stack.push(node.id);
      }
    }
  }
  return descendants;
}

async function create({ workspaceId, parentId, name, completion }) {
  const id = await nextId("treeNode");
  const normalizedParent = parentId === undefined ? null : parentId;
  const initialCompletion = completion !== undefined ? completion : 0;

  if (isMongoConnected()) {
    const created = await TreeNode.create({
      _id: id,
      workspaceId,
      parentId: normalizedParent,
      name,
      completion: initialCompletion,
    });
    return docToRecord(created);
  }

  const { treeNodes } = getStore();
  const node = {
    id,
    workspaceId,
    parentId: normalizedParent,
    name,
    completion: initialCompletion,
  };
  treeNodes.push(node);
  return { ...node };
}

async function update(id, patch) {
  const updateData = {};
  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.parentId !== undefined) updateData.parentId = patch.parentId;
  if (patch.completion !== undefined) updateData.completion = patch.completion;

  if (isMongoConnected()) {
    const updated = await TreeNode.findByIdAndUpdate(id, updateData, { new: true });
    return docToRecord(updated);
  }

  const node = getStore().treeNodes.find((n) => n.id === id);
  if (!node) return null;
  Object.assign(node, updateData);
  return { ...node };
}

async function remove(id) {
  if (isMongoConnected()) {
    const deleted = await TreeNode.findByIdAndDelete(id);
    return docToRecord(deleted);
  }

  const store = getStore();
  const idx = store.treeNodes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const [deleted] = store.treeNodes.splice(idx, 1);
  return { ...deleted };
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
