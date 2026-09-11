const { AppError } = require("../utils/AppError");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");
const workspaceChatRepo = require("../repos/workspaceChat.repo");
const rbacService = require("./rbac.service");
const { eventBus } = require("../utils/eventBus");

async function resolveUser(userOrId) {
  if (!userOrId) return null;
  if (typeof userOrId === "object" && (userOrId.id || userOrId._id || userOrId.userId)) {
    const id = userOrId.id || userOrId._id || userOrId.userId;
    const user = {
      id,
      email: userOrId.email,
      name: userOrId.name,
      orgRole: userOrId.orgRole,
      avatarColor: userOrId.avatarColor,
      avatarUrl: userOrId.avatarUrl,
    };
    if (!user.orgRole || !user.avatarColor) {
      const dbUser = await userRepo.findById(id);
      if (dbUser) {
        user.orgRole = user.orgRole || dbUser.orgRole;
        user.name = user.name || dbUser.name;
        user.avatarColor = user.avatarColor || dbUser.avatarColor;
        user.avatarUrl = user.avatarUrl || dbUser.avatarUrl;
      }
    }
    return user;
  }
  const dbUser = await userRepo.findById(userOrId);
  return dbUser || { id: userOrId, orgRole: "developer" };
}

async function assertWorkspaceAndMembership(workspaceId, userOrId, action = "workspace:read") {
  const user = await resolveUser(userOrId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }
  const workspace = await workspaceRepo.findById(workspaceId);
  if (!workspace) {
    throw new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`);
  }
  rbacService.assertCan(user, workspace, action);
  return { workspace, user };
}

async function attachAuthorDetails(message) {
  if (!message || !message.authorId) return message;
  const author = await userRepo.findById(message.authorId);
  if (author) {
    return {
      ...message,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        avatarColor: author.avatarColor,
        avatarUrl: author.avatarUrl,
      },
    };
  }
  return message;
}

async function listMessages(workspaceId, userOrId, { limit = 50 } = {}) {
  await assertWorkspaceAndMembership(workspaceId, userOrId, "workspace:read");
  const messages = await workspaceChatRepo.findByWorkspace(workspaceId, { limit });
  return await Promise.all(messages.map(attachAuthorDetails));
}

async function createMessage(workspaceId, { text }, userOrId) {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new AppError(422, "VALIDATION_ERROR", "Message text is required.", [
      { path: "body.text", message: "Message text is required." },
    ]);
  }

  const { user } = await assertWorkspaceAndMembership(workspaceId, userOrId, "chat:post");

  const created = await workspaceChatRepo.create({
    workspaceId,
    authorId: user.id,
    text: text.trim(),
  });

  const fullMessage = await attachAuthorDetails(created);

  eventBus.emit("chat:message", {
    workspaceId,
    message: fullMessage,
  });

  return fullMessage;
}

module.exports = {
  listMessages,
  createMessage,
  resolveUser,
};
