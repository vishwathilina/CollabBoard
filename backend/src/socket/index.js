const { Server } = require("socket.io");
const env = require("../config/env");
const { verifyToken } = require("../utils/tokens");
const userRepo = require("../repos/user.repo");
const workspaceRepo = require("../repos/workspace.repo");
const rbacService = require("../services/rbac.service");
const workspaceChatService = require("../services/workspaceChat.service");
const { eventBus } = require("../utils/eventBus");

// In-memory presence map: workspaceId -> Map<userId, PresenceEntry>
// PresenceEntry: { socketIds: Set<string>, user: Object, editingTaskId: string | null, lastSeen: number }
const presenceByWorkspace = new Map();

const HEARTBEAT_TIMEOUT_MS = 45000;

function getWorkspacePresence(workspaceId) {
  if (!presenceByWorkspace.has(workspaceId)) {
    presenceByWorkspace.set(workspaceId, new Map());
  }
  return presenceByWorkspace.get(workspaceId);
}

function serializePresence(workspaceId) {
  const map = presenceByWorkspace.get(workspaceId);
  if (!map) return [];
  const list = [];
  for (const [userId, entry] of map.entries()) {
    list.push({
      userId,
      id: userId,
      name: entry.user.name,
      email: entry.user.email,
      avatarColor: entry.user.avatarColor || "#6366F1",
      avatarUrl: entry.user.avatarUrl || null,
      orgRole: entry.user.orgRole || "developer",
      editingTaskId: entry.editingTaskId || null,
      lastSeen: entry.lastSeen,
    });
  }
  return list;
}

function broadcastPresence(io, workspaceId) {
  const presenceList = serializePresence(workspaceId);
  io.to(`workspace:${workspaceId}`).emit("presence:sync", {
    workspaceId,
    users: presenceList,
  });
}

function removeSocketFromPresence(io, socket) {
  const userId = socket.user?.id;
  if (!userId || !socket.joinedWorkspaces) return;

  for (const workspaceId of socket.joinedWorkspaces) {
    const map = presenceByWorkspace.get(workspaceId);
    if (!map) continue;

    const entry = map.get(userId);
    if (entry) {
      entry.socketIds.delete(socket.id);
      if (entry.socketIds.size === 0) {
        map.delete(userId);
      }
    }

    if (map.size === 0) {
      presenceByWorkspace.delete(workspaceId);
    }

    broadcastPresence(io, workspaceId);
  }
  socket.joinedWorkspaces.clear();
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        env.CLIENT_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null);

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const payload = verifyToken(token);
      const userId = payload.sub || payload.id;
      if (!userId) {
        return next(new Error("Invalid token payload"));
      }

      let user = await userRepo.findById(userId);
      if (!user) {
        user = {
          id: userId,
          name: payload.name || "User",
          email: payload.email || "",
          orgRole: payload.orgRole || "developer",
          avatarColor: "#6366F1",
        };
      }

      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        orgRole: user.orgRole || payload.orgRole || "developer",
        avatarColor: user.avatarColor || "#6366F1",
        avatarUrl: user.avatarUrl || null,
      };
      socket.joinedWorkspaces = new Set();
      return next();
    } catch (err) {
      return next(new Error("Invalid or expired authentication token"));
    }
  });

  io.on("connection", (socket) => {
    // Join workspace room
    socket.on("workspace:join", async ({ workspaceId }, callback) => {
      try {
        if (!workspaceId) {
          if (callback) callback({ success: false, error: "workspaceId is required" });
          return;
        }

        const workspace = await workspaceRepo.findById(workspaceId);
        if (!workspace) {
          if (callback) callback({ success: false, error: "Workspace not found" });
          return;
        }

        // Verify membership
        try {
          rbacService.assertCan(socket.user, workspace, "workspace:read");
        } catch (err) {
          if (callback) callback({ success: false, error: err.message || "Forbidden" });
          return;
        }

        const room = `workspace:${workspaceId}`;
        socket.join(room);
        socket.joinedWorkspaces.add(workspaceId);

        // Add to presence map
        const wsMap = getWorkspacePresence(workspaceId);
        const existing = wsMap.get(socket.user.id);
        if (existing) {
          existing.socketIds.add(socket.id);
          existing.lastSeen = Date.now();
        } else {
          wsMap.set(socket.user.id, {
            socketIds: new Set([socket.id]),
            user: socket.user,
            editingTaskId: null,
            lastSeen: Date.now(),
          });
        }

        broadcastPresence(io, workspaceId);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Leave workspace room
    socket.on("workspace:leave", ({ workspaceId }, callback) => {
      try {
        if (!workspaceId) return;
        const room = `workspace:${workspaceId}`;
        socket.leave(room);
        socket.joinedWorkspaces.delete(workspaceId);

        const map = presenceByWorkspace.get(workspaceId);
        if (map) {
          const entry = map.get(socket.user.id);
          if (entry) {
            entry.socketIds.delete(socket.id);
            if (entry.socketIds.size === 0) {
              map.delete(socket.user.id);
            }
          }
          if (map.size === 0) {
            presenceByWorkspace.delete(workspaceId);
          }
          broadcastPresence(io, workspaceId);
        }
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Presence update (e.g. user opening/closing task drawer: editingTaskId)
    socket.on("presence:update", ({ workspaceId, editingTaskId }) => {
      if (!workspaceId) return;
      const map = presenceByWorkspace.get(workspaceId);
      if (!map) return;

      const entry = map.get(socket.user.id);
      if (entry) {
        entry.editingTaskId = editingTaskId || null;
        entry.lastSeen = Date.now();
        broadcastPresence(io, workspaceId);
      }
    });

    // Heartbeat / ping from client
    socket.on("presence:heartbeat", ({ workspaceId }) => {
      if (!workspaceId) return;
      const map = presenceByWorkspace.get(workspaceId);
      if (map) {
        const entry = map.get(socket.user.id);
        if (entry) {
          entry.lastSeen = Date.now();
        }
      }
    });

    // Live chat message over socket
    socket.on("chat:message", async ({ workspaceId, text }, callback) => {
      try {
        if (!workspaceId || !text) {
          if (callback) callback({ success: false, error: "workspaceId and text are required" });
          return;
        }

        const message = await workspaceChatService.createMessage(
          workspaceId,
          { text },
          socket.user
        );

        if (callback) callback({ success: true, data: message });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Task moved over socket (if client emits after DnD)
    socket.on("task:moved", ({ workspaceId, task }) => {
      if (!workspaceId || !task) return;
      socket.to(`workspace:${workspaceId}`).emit("task:moved", {
        workspaceId,
        task,
      });
    });

    socket.on("disconnect", () => {
      removeSocketFromPresence(io, socket);
    });
  });

  // Stale presence sweep interval (~45s heartbeat timeout)
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [workspaceId, map] of presenceByWorkspace.entries()) {
      let changed = false;
      for (const [userId, entry] of map.entries()) {
        if (now - entry.lastSeen > HEARTBEAT_TIMEOUT_MS) {
          map.delete(userId);
          changed = true;
        }
      }
      if (map.size === 0) {
        presenceByWorkspace.delete(workspaceId);
      }
      if (changed) {
        broadcastPresence(io, workspaceId);
      }
    }
  }, 15000);

  // Forward eventBus events to Socket.io rooms
  eventBus.on("task:moved", ({ workspaceId, task }) => {
    io.to(`workspace:${workspaceId}`).emit("task:moved", { workspaceId, task });
  });

  eventBus.on("task:created", ({ workspaceId, task }) => {
    io.to(`workspace:${workspaceId}`).emit("task:created", { workspaceId, task });
  });

  eventBus.on("task:updated", ({ workspaceId, task }) => {
    io.to(`workspace:${workspaceId}`).emit("task:updated", { workspaceId, task });
  });

  eventBus.on("task:deleted", ({ workspaceId, taskId }) => {
    io.to(`workspace:${workspaceId}`).emit("task:deleted", { workspaceId, taskId });
  });

  eventBus.on("tree:updated", (data) => {
    io.to(`workspace:${data.workspaceId}`).emit("tree:updated", data);
  });

  eventBus.on("comment:message", ({ workspaceId, message, taskId }) => {
    io.to(`workspace:${workspaceId}`).emit("comment:message", {
      workspaceId,
      taskId,
      message,
    });
  });

  eventBus.on("chat:message", ({ workspaceId, message }) => {
    io.to(`workspace:${workspaceId}`).emit("chat:message", {
      workspaceId,
      message,
    });
  });

  return { io, sweepInterval };
}

module.exports = {
  initSocket,
  presenceByWorkspace,
  serializePresence,
};
