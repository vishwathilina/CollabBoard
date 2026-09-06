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
  return "developer";
}

function buildMembers(workspace) {
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

async function seedMongo() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of seed.users) {
    await User.replaceOne(
      { _id: user.id },
      {
        _id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        avatarColor: user.avatarColor,
        passwordHash,
        orgRole: ORG_ROLES[user.id] || "developer",
        title: "",
        bio: "",
        avatarUrl: "",
      },
      { upsert: true }
    );
  }

  for (const ws of seed.workspaces) {
    await Workspace.replaceOne(
      { _id: ws.id },
      {
        _id: ws.id,
        name: ws.name,
        description: ws.description || "",
        color: ws.color,
        ownerId: "u-ada",
        members: buildMembers(ws),
      },
      { upsert: true }
    );
  }

  for (const node of seed.treeNodes) {
    await TreeNode.replaceOne(
      { _id: node.id },
      {
        _id: node.id,
        workspaceId: node.workspaceId,
        parentId: node.parentId,
        name: node.name,
        completion: node.completion ?? 0,
      },
      { upsert: true }
    );
  }

  const orderedTasks = assignTaskOrders(seed.tasks);
  for (const task of orderedTasks) {
    await Task.replaceOne(
      { _id: task.id },
      {
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
      },
      { upsert: true }
    );
  }

  for (const msg of seed.messages) {
    await Message.replaceOne(
      { _id: msg.id },
      {
        _id: msg.id,
        taskId: msg.taskId,
        authorId: msg.authorId,
        text: msg.text,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      },
      { upsert: true }
    );
  }

  for (const att of seed.attachments) {
    await Attachment.replaceOne(
      { _id: att.id },
      {
        _id: att.id,
        taskId: att.taskId,
        name: att.name,
        type: att.type,
        url: att.url,
        addedBy: att.addedBy,
        fileKey: null,
      },
      { upsert: true }
    );
  }

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
