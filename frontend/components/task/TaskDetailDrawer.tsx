"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { BadgeProps, TaskDetailDrawerProps } from "@/types/components";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AvatarGroup } from "@/components/ui/AvatarGroup";
import { MessageChannel } from "@/components/task/MessageChannel";
import { AttachmentList } from "@/components/task/AttachmentList";
import { formatDate, getUsers } from "@/lib/format";
import { apiFetch, getToken } from "@/lib/api";
import type { Task, User } from "@/types";

type DrawerTab = "messages" | "attachments";

const PRIORITY_TONE: Record<Task["priority"], BadgeProps["tone"]> = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
  urgent: "priority-urgent",
};

export function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<DrawerTab>("messages");
  const [displayedTask, setDisplayedTask] = useState<Task | null>(task);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const visible = Boolean(open && task);

  useEffect(() => {
    if (task) {
      setDisplayedTask(task);
      setTab("messages");
      
      const loadUsers = async () => {
        const token = getToken();
        if (!token) return;
        try {
          const usrs = await apiFetch<User[]>("/api/users", { token });
          setAllUsers(usrs);
        } catch (err) {
          console.error(err);
        }
      };
      if (allUsers.length === 0) {
        loadUsers();
      }
    }
  }, [task]);

  useEffect(() => {
    if (!visible) return;

    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  const members = displayedTask
    ? getUsers(allUsers, displayedTask.memberIds)
    : [];

  return (
    <div
      className={`fixed inset-0 z-50 ${visible ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!visible}
      {...(!visible ? { inert: true } : {})}
    >
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        aria-label="Close task detail"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 flex h-full w-[420px] max-w-full flex-col border-l border-border bg-surface shadow-xl transition-transform duration-300 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {displayedTask ? (
          <>
            <header className="shrink-0 border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-sm font-semibold leading-snug text-fg"
                >
                  {displayedTask.title}
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={PRIORITY_TONE[displayedTask.priority]}>
                  {displayedTask.priority}
                </Badge>
                <span className="text-xs text-muted">
                  Due {formatDate(displayedTask.dueDate)}
                </span>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <section className="space-y-2 px-5 py-4">
                <h3 className="text-xs uppercase tracking-wide text-muted">
                  Description
                </h3>
                {displayedTask.description.trim() ? (
                  <p className="whitespace-pre-wrap text-sm text-fg">
                    {displayedTask.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted">No description.</p>
                )}
              </section>

              <section className="space-y-2 px-5 pb-4">
                <h3 className="text-xs uppercase tracking-wide text-muted">
                  Members
                </h3>
                {members.length > 0 ? (
                  <AvatarGroup users={members} max={8} />
                ) : (
                  <p className="text-sm text-muted">No members assigned.</p>
                )}
              </section>

              <div className="mt-auto border-t border-border px-5 pt-3">
                <div
                  role="tablist"
                  aria-label="Task detail sections"
                  className="flex gap-1 rounded-lg bg-surface-2 p-1"
                >
                  <Button
                    variant={tab === "messages" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setTab("messages")}
                    className="flex-1"
                  >
                    Messages
                  </Button>
                  <Button
                    variant={tab === "attachments" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setTab("attachments")}
                    className="flex-1"
                  >
                    Attachments
                  </Button>
                </div>
              </div>

              <div
                role="tabpanel"
                className="px-5 py-4"
                aria-label={tab === "messages" ? "Messages" : "Attachments"}
              >
                {tab === "messages" ? (
                  <MessageChannel taskId={displayedTask.id} />
                ) : (
                  <AttachmentList taskId={displayedTask.id} />
                )}
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
