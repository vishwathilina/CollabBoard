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
  if (messages.length === 0) return [];

  // Batch-load distinct authors to avoid N+1 query pattern
  const authorIds = [...new Set(messages.map((m) => m.authorId).filter(Boolean))];
  const authorDocs = await Promise.all(authorIds.map((id) => userRepo.findById(id)));
  const authorMap = new Map();
  for (const author of authorDocs) {
    if (author) {
      authorMap.set(author.id, {
        id: author.id,
        name: author.name,
        email: author.email,
        avatarColor: author.avatarColor || "#6366F1",
        avatarUrl: author.avatarUrl || null,
      });
    }
  }

  return messages.map((m) => {
    const author = authorMap.get(m.authorId);
    return author ? { ...m, author } : m;
  });
}

async function createMessage(workspaceId, { text }, userOrId) {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new AppError(422, "VALIDATION_ERROR", "Message text is required.", [
      { path: "body.text", message: "Message text is required." },
    ]);
  }

  const trimmed = text.trim();
  if (trimmed.length > 2000) {
    throw new AppError(422, "VALIDATION_ERROR", "Message text cannot exceed 2000 characters.", [
      { path: "body.text", message: "Message text cannot exceed 2000 characters." },
    ]);
  }

  const { user } = await assertWorkspaceAndMembership(workspaceId, userOrId, "chat:post");

  const created = await workspaceChatRepo.create({
    workspaceId,
    authorId: user.id,
    text: trimmed,
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
