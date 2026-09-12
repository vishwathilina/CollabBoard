const mongoose = require("mongoose");
const { Task } = require("../models/Task");
const { Message } = require("../models/Message");
const { Attachment } = require("../models/Attachment");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function findById(id) {
  if (isMongoConnected()) {
    return Task.findById(id).then(docToRecord);
  }
  const { tasks } = getStore();
  const task = tasks.find((t) => t.id === id);
  return task
    ? {
        ...task,
        order: typeof task.order === "number" ? task.order : 0,
        version: task.version ?? 1,
      }
    : null;
}

function findByWorkspace(workspaceId, filters = {}) {
  const { treeNode, treeNodeIds, column } = filters;

  if (isMongoConnected()) {
    const query = { workspaceId };
    if (treeNode) {
      query.treeNodeId = treeNode;
    } else if (treeNodeIds && Array.isArray(treeNodeIds)) {
      query.treeNodeId = { $in: treeNodeIds };
    }
    if (column) {
      query.column = column;
    }
    return Task.find(query)
      .sort({ order: 1, createdAt: 1 })
      .then((tasks) => tasks.map(docToRecord));
  }

  let tasks = getStore().tasks.filter((t) => {
    if (t.workspaceId !== workspaceId) return false;
    if (treeNode && t.treeNodeId !== treeNode) return false;
    if (treeNodeIds && Array.isArray(treeNodeIds) && !treeNodeIds.includes(t.treeNodeId)) return false;
    if (column && t.column !== column) return false;
    return true;
  });

  tasks.sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.id || "").localeCompare(b.id || "");
  });

  return tasks.map((t) => ({
    ...t,
    order: typeof t.order === "number" ? t.order : 0,
    version: t.version ?? 1,
  }));
}

async function getNextOrder(workspaceId, column) {
  if (isMongoConnected()) {
    const last = await Task.findOne({ workspaceId, column }).sort({ order: -1 }).select("order");
    return last && typeof last.order === "number" ? last.order + 1 : 0;
  }
  const tasks = getStore().tasks.filter((t) => t.workspaceId === workspaceId && t.column === column);
  if (tasks.length === 0) return 0;
  const maxOrder = Math.max(...tasks.map((t) => (typeof t.order === "number" ? t.order : 0)));
  return maxOrder + 1;
}

async function create(fields) {
  const id = fields.id || (await nextId("task"));
  const order =
    typeof fields.order === "number"
      ? fields.order
      : await getNextOrder(fields.workspaceId, fields.column);
  const version = fields.version ?? 1;

  if (isMongoConnected()) {
    const doc = await Task.create({
      _id: id,
      workspaceId: fields.workspaceId,
      treeNodeId: fields.treeNodeId,
      column: fields.column,
      title: fields.title,
      description: fields.description ?? "",
      priority: fields.priority,
      memberIds: fields.memberIds ?? [],
      startDate: fields.startDate ?? null,
      dueDate: fields.dueDate ?? null,
      completion: fields.completion ?? 0,
      version,
      order,
      updatedBy: fields.updatedBy ?? null,
    });
    return docToRecord(doc);
  }

  const { tasks } = getStore();
  const task = {
    id,
    workspaceId: fields.workspaceId,
    treeNodeId: fields.treeNodeId,
    column: fields.column,
    title: fields.title,
    description: fields.description ?? "",
    priority: fields.priority,
    memberIds: fields.memberIds ?? [],
    startDate: fields.startDate ?? null,
    dueDate: fields.dueDate ?? null,
    completion: fields.completion ?? 0,
    version,
    order,
    updatedBy: fields.updatedBy ?? null,
  };
  tasks.push(task);
  return { ...task };
}

async function update(id, patch) {
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
    "order",
    "updatedBy",
  ];

  const sanitized = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sanitized[key] = patch[key];
    }
  }

  if (isMongoConnected()) {
    const updated = await Task.findByIdAndUpdate(
      id,
      { $set: sanitized },
      { new: true, runValidators: true }
    );
    return docToRecord(updated);
  }

  const task = getStore().tasks.find((t) => t.id === id);
  if (!task) return null;
  Object.assign(task, sanitized);
  return { ...task };
}

async function updateWithVersion(id, expectedVersion, patch, updatedBy) {
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
    "order",
  ];

  const setFields = { updatedBy };
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      setFields[key] = patch[key];
    }
  }

  if (isMongoConnected()) {
    const updated = await Task.findOneAndUpdate(
      { _id: id, version: expectedVersion },
      { $set: setFields, $inc: { version: 1 } },
      { new: true, runValidators: true }
    );
    return docToRecord(updated);
  }

  const task = getStore().tasks.find((t) => t.id === id);
  if (!task) return null;
  if (task.version !== expectedVersion) return null; // Conflict

  Object.assign(task, setFields);
  task.version += 1;
  return { ...task };
}

async function remove(id) {
  if (isMongoConnected()) {
    const deleted = await Task.findByIdAndDelete(id);
    if (!deleted) return null;
    await Message.deleteMany({ taskId: id });
    await Attachment.deleteMany({ taskId: id });
    return docToRecord(deleted);
  }

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
  updateWithVersion,
  remove,
};
