const bcrypt = require("bcryptjs");
const seed = require("./seed");
const { User } = require("../models/User");
const { Workspace } = require("../models/Workspace");
const { TreeNode } = require("../models/TreeNode");
const { Task } = require("../models/Task");
const { Message } = require("../models/Message");
const { Attachment } = require("../models/Attachment");

const DEMO_PASSWORD = "CollabBoard!1";

const ORG_ROLES = {
  "u-ada": "senior_project_manager",
  "u-grace": "project_manager",
  "u-linus": "developer",
};

const LINUS_VISIBLE = ["tn-engineering", "tn-api", "tn-frontend"];

function memberRoleFor(userId) {
  if (userId === "u-ada") return "owner";
  if (userId === "u-grace") return "project_manager";
  if (userId === "u-linus") return "developer";
  if (userId === "u-alan") return "developer";
  if (userId === "u-margaret") return "developer";
  if (userId === "u-dennis") return "qa";
  if (userId === "u-barbara") return "designer";
  if (userId === "u-tim") return "viewer";
  return "developer";
}

function buildMembers(workspace) {
  if (workspace.members && workspace.members.length > 0) {
    return workspace.members;
  }
  return (workspace.memberIds || []).map((userId) => {
    const member = {
      userId,
      role: memberRoleFor(userId),
    };
    if (userId === "u-linus" && workspace.id === "ws-website") {
      member.visibleTreeNodeIds = [...LINUS_VISIBLE];
    }
    return member;
  });
}

function assignTaskOrders(tasks) {
  const counters = new Map();
  return tasks.map((task) => {
    const key = `${task.workspaceId}:${task.column}`;
    const order = counters.has(key) ? counters.get(key) : 0;
    counters.set(key, order + 1);
    return { ...task, order, version: task.version ?? 1 };
  });
}

let cachedPasswordHash = null;

async function seedMongo() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  }
  const passwordHash = cachedPasswordHash;

  const userDocs = seed.users.map((user) => ({
    _id: user.id,
    name: user.name,
    email: user.email.toLowerCase(),
    avatarColor: user.avatarColor,
    passwordHash,
    orgRole: user.orgRole || ORG_ROLES[user.id] || "developer",
    title: "",
    bio: "",
    avatarUrl: "",
  }));

  const wsDocs = seed.workspaces.map((ws) => ({
    _id: ws.id,
    name: ws.name,
    description: ws.description || "",
    color: ws.color,
    ownerId: "u-ada",
    members: buildMembers(ws),
  }));

  const nodeDocs = seed.treeNodes.map((node) => ({
    _id: node.id,
    workspaceId: node.workspaceId,
    parentId: node.parentId,
    name: node.name,
    completion: node.completion ?? 0,
  }));

  const taskDocs = assignTaskOrders(seed.tasks).map((task) => ({
    _id: task.id,
    workspaceId: task.workspaceId,
    treeNodeId: task.treeNodeId,
    column: task.column,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    memberIds: task.memberIds ?? [],
    startDate: task.startDate ?? null,
    dueDate: task.dueDate ?? null,
    completion: task.completion ?? 0,
    version: task.version ?? 1,
    order: task.order,
    updatedBy: null,
  }));

  const msgDocs = seed.messages.map((msg) => ({
    _id: msg.id,
    taskId: msg.taskId,
    authorId: msg.authorId,
    text: msg.text,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
  }));

  const attDocs = seed.attachments.map((att) => ({
    _id: att.id,
    taskId: att.taskId,
    name: att.name,
    type: att.type,
    url: att.url,
    addedBy: att.addedBy,
    fileKey: null,
  }));

  await Promise.all([
    Promise.all(userDocs.map((doc) => User.replaceOne({ _id: doc._id }, doc, { upsert: true }))),
    Promise.all(wsDocs.map((doc) => Workspace.replaceOne({ _id: doc._id }, doc, { upsert: true }))),
    Promise.all(nodeDocs.map((doc) => TreeNode.replaceOne({ _id: doc._id }, doc, { upsert: true }))),
    Promise.all(taskDocs.map((doc) => Task.replaceOne({ _id: doc._id }, doc, { upsert: true }))),
    Promise.all(msgDocs.map((doc) => Message.replaceOne({ _id: doc._id }, doc, { upsert: true }))),
    Promise.all(attDocs.map((doc) => Attachment.replaceOne({ _id: doc._id }, doc, { upsert: true }))),
  ]);

  return {
    users: seed.users.length,
    workspaces: seed.workspaces.length,
    treeNodes: seed.treeNodes.length,
    tasks: seed.tasks.length,
    messages: seed.messages.length,
    attachments: seed.attachments.length,
  };
}

module.exports = { seedMongo, DEMO_PASSWORD };
