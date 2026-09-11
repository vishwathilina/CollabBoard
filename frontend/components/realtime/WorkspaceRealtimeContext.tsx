"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { getSocket } from "@/lib/socket";
import { apiFetch, getToken } from "@/lib/api";
import type { PresenceUser, WorkspaceChatMessage, User } from "@/types";

interface WorkspaceRealtimeContextValue {
  workspaceId: string;
  onlineUsers: PresenceUser[];
  editingMap: Record<string, PresenceUser>; // taskId -> user editing it
  chatMessages: WorkspaceChatMessage[];
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  setEditingTask: (taskId: string | null) => void;
  sendChatMessage: (text: string) => Promise<void>;
  loadChatHistory: () => Promise<void>;
  chatLoading: boolean;
  chatError: string | null;
  emitTaskMoved: (task: unknown) => void;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  isConnected: boolean;
}

const WorkspaceRealtimeContext = createContext<WorkspaceRealtimeContextValue | null>(null);

export function useWorkspaceRealtime() {
  const context = useContext(WorkspaceRealtimeContext);
  if (!context) {
    throw new Error("useWorkspaceRealtime must be used within a WorkspaceRealtimeProvider");
  }
  return context;
}

export function useOptionalWorkspaceRealtime() {
  return useContext(WorkspaceRealtimeContext);
}

interface WorkspaceRealtimeProviderProps {
  workspaceId: string;
  currentUser?: User | null;
  children: React.ReactNode;
}

export function WorkspaceRealtimeProvider({
  workspaceId,
  currentUser,
  children,
}: WorkspaceRealtimeProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [editingMap, setEditingMap] = useState<Record<string, PresenceUser>>({});
  const [chatMessages, setChatMessages] = useState<WorkspaceChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const currentEditingTaskRef = useRef<string | null>(null);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    subscribersRef.current.get(event)!.add(handler);

    return () => {
      const set = subscribersRef.current.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          subscribersRef.current.delete(event);
        }
      }
    };
  }, []);

  const dispatchToSubscribers = useCallback((event: string, data: any) => {
    const handlers = subscribersRef.current.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }, []);

  // Connect socket and join room
  useEffect(() => {
    const token = getToken();
    if (!token || !workspaceId) return;

    const socket = getSocket(token);
    if (!socket) return;

    function handleConnect() {
      setIsConnected(true);
      socket?.emit("workspace:join", { workspaceId }, (res?: { success: boolean; error?: string }) => {
        if (res && !res.success) {
          console.warn("Failed to join workspace socket room:", res.error);
        } else {
          // Replay active editing task after join or reconnect
          if (currentEditingTaskRef.current) {
            socket?.emit("presence:update", {
              workspaceId,
              editingTaskId: currentEditingTaskRef.current,
            });
          }
        }
      });
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    function handlePresenceSync(data: { workspaceId: string; users: PresenceUser[] }) {
      if (data.workspaceId !== workspaceId) return;
      setOnlineUsers(data.users || []);

      const nextEditingMap: Record<string, PresenceUser> = {};
      for (const u of data.users || []) {
        if (u.editingTaskId) {
          // don't show self-editing badge to oneself if matching current user
          if (!currentUser || u.userId !== currentUser.id) {
            nextEditingMap[u.editingTaskId] = u;
          }
        }
      }
      setEditingMap(nextEditingMap);
    }

    function handleChatMessage(data: { workspaceId: string; message: WorkspaceChatMessage }) {
      if (data.workspaceId !== workspaceId || !data.message) return;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) {
          return prev;
        }
        return [...prev, data.message];
      });
      dispatchToSubscribers("chat:message", data.message);
    }

    function handleTaskMoved(data: any) {
      dispatchToSubscribers("task:moved", data);
    }
    function handleTaskCreated(data: any) {
      dispatchToSubscribers("task:created", data);
    }
    function handleTaskUpdated(data: any) {
      dispatchToSubscribers("task:updated", data);
    }
    function handleTaskDeleted(data: any) {
      dispatchToSubscribers("task:deleted", data);
    }
    function handleTreeUpdated(data: any) {
      dispatchToSubscribers("tree:updated", data);
    }
    function handleCommentMessage(data: any) {
      dispatchToSubscribers("comment:message", data);
    }

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence:sync", handlePresenceSync);
    socket.on("chat:message", handleChatMessage);
    socket.on("task:moved", handleTaskMoved);
    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("tree:updated", handleTreeUpdated);
    socket.on("comment:message", handleCommentMessage);

    // Heartbeat interval
    const heartbeatTimer = setInterval(() => {
      if (socket.connected) {
        socket.emit("presence:heartbeat", { workspaceId });
      }
    }, 25000);

    return () => {
      clearInterval(heartbeatTimer);
      socket.emit("workspace:leave", { workspaceId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:sync", handlePresenceSync);
      socket.off("chat:message", handleChatMessage);
      socket.off("task:moved", handleTaskMoved);
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("tree:updated", handleTreeUpdated);
      socket.off("comment:message", handleCommentMessage);
    };
  }, [workspaceId, currentUser, dispatchToSubscribers]);

  const setEditingTask = useCallback(
    (taskId: string | null) => {
      currentEditingTaskRef.current = taskId;
      const token = getToken();
      const socket = getSocket(token);
      if (socket && socket.connected) {
        socket.emit("presence:update", {
          workspaceId,
          editingTaskId: taskId,
        });
      }
    },
    [workspaceId]
  );

  const loadChatHistory = useCallback(async () => {
    const token = getToken();
    if (!token || !workspaceId) return;

    setChatLoading(true);
    setChatError(null);
    try {
      const messages = await apiFetch<WorkspaceChatMessage[]>(
        `/api/workspaces/${workspaceId}/chat`,
        { token }
      );
      // Merge and deduplicate with live messages received while in-flight
      setChatMessages((prev) => {
        const fetched = Array.isArray(messages) ? messages : [];
        const map = new Map<string, WorkspaceChatMessage>();
        fetched.forEach((m) => map.set(m.id, m));
        prev.forEach((m) => map.set(m.id, m));
        return Array.from(map.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    } catch (err: unknown) {
      console.error("Failed to load chat history:", err);
      setChatError(err instanceof Error ? err.message : "Failed to load chat history");
    } finally {
      setChatLoading(false);
    }
  }, [workspaceId]);

  const sendChatMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const token = getToken();
      if (!token) return;

      setChatError(null);
      const socket = getSocket(token);

      // Attempt socket emit first
      if (socket && socket.connected) {
        return new Promise<void>((resolve, reject) => {
          socket.emit(
            "chat:message",
            { workspaceId, text: text.trim() },
            (res?: { success: boolean; data?: WorkspaceChatMessage; error?: string }) => {
              if (res && !res.success) {
                const msg = res.error || "Failed to send message";
                setChatError(msg);
                reject(new Error(msg));
              } else {
                if (res?.data) {
                  setChatMessages((prev) => {
                    if (prev.some((m) => m.id === res.data!.id)) return prev;
                    return [...prev, res.data!];
                  });
                }
                resolve();
              }
            }
          );
        });
      }

      // REST fallback
      try {
        const created = await apiFetch<WorkspaceChatMessage>(
          `/api/workspaces/${workspaceId}/chat`,
          {
            method: "POST",
            body: JSON.stringify({ text: text.trim() }),
            token,
          }
        );
        if (created) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === created.id)) return prev;
            return [...prev, created];
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send message";
        setChatError(msg);
        throw err;
      }
    },
    [workspaceId]
  );

  const emitTaskMoved = useCallback(
    (task: unknown) => {
      const token = getToken();
      const socket = getSocket(token);
      if (socket && socket.connected) {
        socket.emit("task:moved", {
          workspaceId,
          task,
        });
      }
    },
    [workspaceId]
  );

  const value: WorkspaceRealtimeContextValue = useMemo(
    () => ({
      workspaceId,
      onlineUsers,
      editingMap,
      chatMessages,
      isChatOpen,
      setIsChatOpen,
      setEditingTask,
      sendChatMessage,
      loadChatHistory,
      chatLoading,
      chatError,
      emitTaskMoved,
      subscribe,
      isConnected,
    }),
    [
      workspaceId,
      onlineUsers,
      editingMap,
      chatMessages,
      isChatOpen,
      setIsChatOpen,
      setEditingTask,
      sendChatMessage,
      loadChatHistory,
      chatLoading,
      chatError,
      emitTaskMoved,
      subscribe,
      isConnected,
    ]
  );

  return (
    <WorkspaceRealtimeContext.Provider value={value}>
      {children}
    </WorkspaceRealtimeContext.Provider>
  );
}
