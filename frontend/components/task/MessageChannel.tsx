"use client";

import { useEffect, useState } from "react";
import { Trash2, Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, getUser } from "@/lib/format";
import { apiFetch, getToken } from "@/lib/api";
import type { MessageChannelProps } from "@/types/components";
import type { Message, User } from "@/types";

function getCurrentUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

export function MessageChannel({ taskId }: MessageChannelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    const token = getToken();
    if (!token) return;
    setCurrentUserId(getCurrentUserId(token));

    try {
      const [msgs, usrs] = await Promise.all([
        apiFetch<Message[]>(`/api/tasks/${taskId}/messages`, { token }),
        apiFetch<User[]>("/api/users", { token }),
      ]);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await apiFetch<Message>(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
        token,
      });
      setText("");
      if (created && created.id) {
        setMessages((prev) => [...prev, created]);
      } else {
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to post message.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      await apiFetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        token,
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to delete message.");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted">Loading messages...</div>;
  }

  const thread = messages
    .slice()
    .sort(
      (a, b) =>
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        (a.id || "").localeCompare(b.id || "")
    );

  return (
    <div className="flex flex-col">
      {errorMessage && (
        <div className="mb-2 rounded-lg bg-red-950/30 p-2 text-xs text-red-400 border border-red-900/40">
          {errorMessage}
        </div>
      )}

      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
        {thread.length === 0 ? (
          <p className="text-sm text-muted">No messages yet.</p>
        ) : (
          thread.map((message) => {
            const author = getUser(users, message.authorId);
            const isOwn = currentUserId === message.authorId;

            return (
              <div
                key={message.id}
                className="group flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-2/40"
              >
                {author ? (
                  <Avatar user={author} size="sm" />
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted"
                  >
                    ?
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-fg">
                      {author?.name ?? "Unknown"}
                    </span>
                    <time
                      className="text-xs text-muted"
                      dateTime={message.createdAt}
                    >
                      {formatDate(message.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-fg">
                    {message.text}
                  </p>
                </div>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDelete(message.id)}
                    aria-label="Delete message"
                    title="Delete message"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          placeholder="Type a message..."
          aria-label="Message composer"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          aria-label="Send message"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
