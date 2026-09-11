"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Send, MessageSquare, AlertCircle } from "lucide-react";
import { useWorkspaceRealtime } from "@/components/realtime/WorkspaceRealtimeContext";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/format";
import type { User, WorkspaceChatMessage } from "@/types";

interface WorkspaceChatDrawerProps {
  currentUser?: User | null;
  isViewer?: boolean;
}

export function WorkspaceChatDrawer({
  currentUser,
  isViewer = false,
}: WorkspaceChatDrawerProps) {
  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    sendChatMessage,
    loadChatHistory,
    chatLoading,
    chatError,
    onlineUsers,
  } = useWorkspaceRealtime();

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history when drawer opens
  useEffect(() => {
    if (isChatOpen) {
      loadChatHistory();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isChatOpen, loadChatHistory]);

  // Auto-scroll to bottom on new messages or drawer open
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // Handle escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isChatOpen) {
        setIsChatOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isChatOpen, setIsChatOpen]);

  if (!isChatOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending || isViewer) return;

    setSending(true);
    setLocalError(null);
    try {
      await sendChatMessage(text);
      setInputText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setLocalError(msg);
    } finally {
      setSending(false);
    }
  };

  const currentUserId = currentUser?.id;

  return (
    <div
      role="dialog"
      aria-label="Workspace chat"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsChatOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-bg shadow-2xl transition-all duration-300">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">Workspace chat</h2>
              <p className="text-[11px] text-muted">
                {onlineUsers.length} online now • Live channel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsChatOpen(false)}
            aria-label="Close chat"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Error Notification */}
        {(chatError || localError) && (
          <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{localError || chatError}</span>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatLoading && chatMessages.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted">
              Loading chat messages...
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40 text-muted" />
              <p className="text-sm font-medium text-fg">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation with your team!</p>
            </div>
          ) : (
            chatMessages.map((msg: WorkspaceChatMessage) => {
              const isOwn = msg.authorId === currentUserId;
              const authorUser: User = msg.author
                ? {
                    id: msg.author.id,
                    name: msg.author.name,
                    email: msg.author.email,
                    avatarColor: msg.author.avatarColor || "#6366F1",
                    avatarUrl: msg.author.avatarUrl || undefined,
                  }
                : {
                    id: msg.authorId,
                    name: "Unknown Member",
                    email: "",
                    avatarColor: "#6366F1",
                  };

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${
                    isOwn ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar user={authorUser} size="xs" />
                  <div
                    className={`max-w-[78%] rounded-xl px-3 py-2 text-sm shadow-xs ${
                      isOwn
                        ? "bg-accent text-accent-fg rounded-tr-xs"
                        : "bg-surface border border-border text-fg rounded-tl-xs"
                    }`}
                  >
                    <div
                      className={`flex items-baseline gap-2 text-[10px] mb-0.5 ${
                        isOwn ? "justify-end text-accent-fg/80" : "text-muted"
                      }`}
                    >
                      <span className="font-semibold">{authorUser.name}</span>
                      <span>{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer / Footer */}
        <footer className="border-t border-border bg-surface p-3">
          {isViewer ? (
            <div className="rounded-lg bg-surface-2/60 border border-border/60 p-2.5 text-center text-xs text-muted">
              Viewers have read-only access and cannot post messages.
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message to workspace..."
                disabled={sending}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                aria-label="Send message"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </footer>
      </aside>
    </div>
  );
}
