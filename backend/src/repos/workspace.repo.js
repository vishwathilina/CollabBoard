const mongoose = require("mongoose");
const { Workspace } = require("../models/Workspace");
const { TreeNode } = require("../models/TreeNode");
const { Task } = require("../models/Task");
const { Message } = require("../models/Message");
const { Attachment } = require("../models/Attachment");
const { docToRecord } = require("./serialize");
const { getStore } = require("../store/memory.store");
const { nextId } = require("../store/ids");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function normalizeWorkspace(raw) {
  if (!raw) return null;
  const w = docToRecord(raw);
  if (!w) return null;

  const ownerId = w.ownerId || (w.memberIds && w.memberIds[0]) || "";
  let members = Array.isArray(w.members) ? [...w.members] : [];

  // If members array is missing but memberIds is present, populate members
  if (members.length === 0 && Array.isArray(w.memberIds)) {
    members = w.memberIds.map((userId) => ({
      userId,
      role: userId === ownerId ? "owner" : "developer",
    }));
  }

  // Derive memberIds for backward compatibility
  const memberIds = Array.from(
    new Set(
      members.length > 0
        ? members.map((m) => m.userId)
        : Array.isArray(w.memberIds)
        ? w.memberIds
        : []
    )
  );

  return {
    id: w.id || w._id,
    name: w.name,
    description: w.description || "",
    color: w.color || "#C6F135",
    ownerId,
    members,
    memberIds,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

async function findById(id) {
  if (isMongoConnected()) {
    const ws = await Workspace.findById(id);
    return normalizeWorkspace(ws);
  }
  const { workspaces } = getStore();
  const ws = workspaces.find((w) => w.id === id);
  return normalizeWorkspace(ws);
}

async function findAll() {
  if (isMongoConnected()) {
    const list = await Workspace.find();
    return list.map(normalizeWorkspace);
  }
  return getStore().workspaces.map(normalizeWorkspace);
}

async function findByMember(userId) {
  if (isMongoConnected()) {
    const list = await Workspace.find({
      $or: [{ "members.userId": userId }, { ownerId: userId }],
    });
    return list.map(normalizeWorkspace);
  }
  return getStore()
    .workspaces.map(normalizeWorkspace)
    .filter(
      (w) =>
        (w.memberIds && w.memberIds.includes(userId)) ||
        (w.members && w.members.some((m) => m.userId === userId)) ||
        w.ownerId === userId
    );
}

async function create({ name, description, color, ownerId, creatorId, members }) {
  const actualOwner = ownerId || creatorId;
  const initialMembers =
    Array.isArray(members) && members.length > 0
      ? members
      : [{ userId: actualOwner, role: "owner" }];
  const id = nextId("workspace");

  if (isMongoConnected()) {
    const created = await Workspace.create({
      _id: id,
      name,
      description: description || "",
      color: color || "#C6F135",
      ownerId: actualOwner,
      members: initialMembers,
    });
    return normalizeWorkspace(created);
  }

  const { workspaces } = getStore();
  const workspace = {
    id,
    name,
    description: description || "",
    color: color || "#C6F135",
    ownerId: actualOwner,
    members: initialMembers,
    memberIds: initialMembers.map((m) => m.userId),
  };
  workspaces.push(workspace);
  return normalizeWorkspace(workspace);
}

async function update(id, patch) {
  if (isMongoConnected()) {
    const updateData = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.color !== undefined) updateData.color = patch.color;
    if (patch.ownerId !== undefined) updateData.ownerId = patch.ownerId;
    if (patch.members !== undefined) updateData.members = patch.members;

    const updated = await Workspace.findByIdAndUpdate(id, updateData, { new: true });
    return normalizeWorkspace(updated);
  }

  const { workspaces } = getStore();
  const workspace = workspaces.find((w) => w.id === id);
  if (!workspace) return null;
  if (patch.name !== undefined) workspace.name = patch.name;
  if (patch.description !== undefined) workspace.description = patch.description;
  if (patch.color !== undefined) workspace.color = patch.color;
  if (patch.ownerId !== undefined) workspace.ownerId = patch.ownerId;
  if (patch.members !== undefined) {
    workspace.members = patch.members;
    workspace.memberIds = patch.members.map((m) => m.userId);
  }
  return normalizeWorkspace(workspace);
}

async function addMember(workspaceId, memberData) {
  const memberObj =
    typeof memberData === "string"
      ? { userId: memberData, role: "developer" }
      : {
          userId: memberData.userId,
          role: memberData.role || "developer",
          visibleTreeNodeIds: memberData.visibleTreeNodeIds,
        };

  if (isMongoConnected()) {
    const ws = await Workspace.findById(workspaceId);
    if (!ws) return null;
    const existing = ws.members.find((m) => m.userId === memberObj.userId);
    if (!existing) {
      ws.members.push(memberObj);
      await ws.save();
    }
    return normalizeWorkspace(ws);
  }

  const { workspaces } = getStore();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;
  if (!workspace.members) workspace.members = [];
  const existing = workspace.members.find((m) => m.userId === memberObj.userId);
  if (!existing) {
    workspace.members.push(memberObj);
    if (!workspace.memberIds) workspace.memberIds = [];
    if (!workspace.memberIds.includes(memberObj.userId)) {
      workspace.memberIds.push(memberObj.userId);
    }
  }
  return normalizeWorkspace(workspace);
}

async function updateMember(workspaceId, userId, patch) {
  if (isMongoConnected()) {
    const ws = await Workspace.findById(workspaceId);
    if (!ws) return null;
    const member = ws.members.find((m) => m.userId === userId);
    if (!member) return null;
    if (patch.role !== undefined) member.role = patch.role;
    if (patch.visibleTreeNodeIds !== undefined) {
      member.visibleTreeNodeIds = patch.visibleTreeNodeIds;
    }
    await ws.save();
    return normalizeWorkspace(ws);
  }

  const { workspaces } = getStore();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;
  if (!workspace.members) return null;
  const member = workspace.members.find((m) => m.userId === userId);
  if (!member) return null;
  if (patch.role !== undefined) member.role = patch.role;
  if (patch.visibleTreeNodeIds !== undefined) {
    member.visibleTreeNodeIds = patch.visibleTreeNodeIds;
  }
  return normalizeWorkspace(workspace);
}

async function removeMember(workspaceId, userId) {
  if (isMongoConnected()) {
    const ws = await Workspace.findById(workspaceId);
    if (!ws) return null;
    ws.members = ws.members.filter((m) => m.userId !== userId);
    await ws.save();
    return normalizeWorkspace(ws);
  }

  const { workspaces } = getStore();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;
  if (workspace.members) {
    workspace.members = workspace.members.filter((m) => m.userId !== userId);
  }
  if (workspace.memberIds) {
    workspace.memberIds = workspace.memberIds.filter((id) => id !== userId);
  }
  return normalizeWorkspace(workspace);
}

async function remove(workspaceId) {
  if (isMongoConnected()) {
    const ws = await Workspace.findByIdAndDelete(workspaceId);
    if (!ws) return null;

    // Cascade delete treeNodes, tasks, messages, attachments
    const tasks = await Task.find({ workspaceId }).select("_id");
    const taskIds = tasks.map((t) => t._id);

    await TreeNode.deleteMany({ workspaceId });
    await Task.deleteMany({ workspaceId });
    if (taskIds.length > 0) {
      await Message.deleteMany({ taskId: { $in: taskIds } });
      await Attachment.deleteMany({ taskId: { $in: taskIds } });
    }

    return normalizeWorkspace(ws);
  }

  const store = getStore();
  const idx = store.workspaces.findIndex((w) => w.id === workspaceId);
  if (idx === -1) return null;
  const [deleted] = store.workspaces.splice(idx, 1);

  // Cascade: treeNodes, tasks, messages, attachments
  const taskIdsToDelete = store.tasks
    .filter((t) => t.workspaceId === workspaceId)
    .map((t) => t.id);
  const taskIdSet = new Set(taskIdsToDelete);

  store.treeNodes = store.treeNodes.filter((n) => n.workspaceId !== workspaceId);
  store.tasks = store.tasks.filter((t) => t.workspaceId !== workspaceId);
  store.messages = store.messages.filter((m) => !taskIdSet.has(m.taskId));
  store.attachments = store.attachments.filter((a) => !taskIdSet.has(a.taskId));

  return normalizeWorkspace(deleted);
}

module.exports = {
  findById,
  findAll,
  findByMember,
  create,
  update,
  addMember,
  updateMember,
  removeMember,
  remove,
};
