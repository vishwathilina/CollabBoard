"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, getUser } from "@/lib/format";
import { apiFetch, getToken } from "@/lib/api";
import type { MessageChannelProps } from "@/types/components";
import type { Message, User } from "@/types";

export function MessageChannel({ taskId }: MessageChannelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [msgs, usrs] = await Promise.all([
        apiFetch<Message[]>(`/api/tasks/${taskId}/messages`, { token }),
        apiFetch<User[]>("/api/users", { token }),
      ]);
      setMessages(msgs);
      setUsers(usrs);
    } catch (err) {
      console.error(err);
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
    try {
      await apiFetch(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
        token,
      });
      setText("");
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
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
        a.id.localeCompare(b.id),
    );

  return (
    <div className="flex flex-col">
      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
        {thread.length === 0 ? (
          <p className="text-sm text-muted">No messages yet.</p>
        ) : (
          thread.map((message) => {
            const author = getUser(users, message.authorId);

            return (
              <div key={message.id} className="flex gap-2.5">
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
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          placeholder="Type a message..."
          aria-label="Message composer"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed"
        />
      </form>
    </div>
  );
}
