"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X, Pencil, Check, AlertCircle } from "lucide-react";
import type { BadgeProps, TaskDetailDrawerProps } from "@/types/components";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AvatarGroup } from "@/components/ui/AvatarGroup";
import { MessageChannel } from "@/components/task/MessageChannel";
import { AttachmentList } from "@/components/task/AttachmentList";
import { formatDate, getUsers } from "@/lib/format";
import { apiFetch, getToken, ApiError } from "@/lib/api";
import type { Task, User } from "@/types";

type DrawerTab = "messages" | "attachments";

const PRIORITY_TONE: Record<Task["priority"], BadgeProps["tone"]> = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
  urgent: "priority-urgent",
};

export function TaskDetailDrawer({
  task,
  open,
  onClose,
  onTaskUpdated,
}: TaskDetailDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<DrawerTab>("messages");
  const [displayedTask, setDisplayedTask] = useState<Task | null>(task);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");
  const [editCompletion, setEditCompletion] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const visible = Boolean(open && task);

  useEffect(() => {
    if (task) {
      setDisplayedTask(task);
      setEditTitle(task.title);
      setEditDescription(task.description);
      setEditPriority(task.priority);
      setEditCompletion(task.completion);
      setIsEditing(false);
      setConflictError(null);
      setTab("messages");

      const token = getToken();
      if (!token) return;

      apiFetch<User[]>("/api/users", { token })
        .then(setAllUsers)
        .catch(console.error);
    }
  }, [task]);

  useEffect(() => {
    if (!visible) return;

    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, isEditing, onClose]);

  const handleSave = async () => {
    if (!displayedTask) return;
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setConflictError(null);

    try {
      const updated = await apiFetch<Task>(`/api/tasks/${displayedTask.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          title: editTitle.trim() || displayedTask.title,
          description: editDescription,
          priority: editPriority,
          completion: Number(editCompletion) || 0,
          version: displayedTask.version,
        }),
      });

      setDisplayedTask(updated);
      setIsEditing(false);
      onTaskUpdated?.(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 409 || err.code === "CONFLICT")) {
        setConflictError("Task was modified by another teammate (version conflict). Fetching latest version...");
        // Re-fetch latest task
        try {
          const latest = await apiFetch<Task>(`/api/tasks/${displayedTask.id}`, { token });
          setDisplayedTask(latest);
          setEditTitle(latest.title);
          setEditDescription(latest.description);
          setEditPriority(latest.priority);
          setEditCompletion(latest.completion);
          onTaskUpdated?.(latest);
        } catch {
          // ignore
        }
      } else {
        setConflictError(err instanceof Error ? err.message : "Failed to update task.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (displayedTask) {
      setEditTitle(displayedTask.title);
      setEditDescription(displayedTask.description);
      setEditPriority(displayedTask.priority);
      setEditCompletion(displayedTask.completion);
    }
    setConflictError(null);
    setIsEditing(false);
  };

  const members = displayedTask ? getUsers(allUsers, displayedTask.memberIds) : [];

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
        className={`absolute inset-y-0 right-0 flex h-full w-[440px] max-w-full flex-col border-l border-border bg-surface shadow-xl transition-transform duration-300 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {displayedTask ? (
          <>
            <header className="shrink-0 border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-accent/40 bg-surface-2 px-3 py-1 text-sm font-semibold text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Task title"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 id={titleId} className="text-sm font-semibold leading-snug text-fg">
                      {displayedTask.title}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit task"
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
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

              {conflictError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 p-2 text-xs text-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{conflictError}</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted">Priority:</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
                        className="rounded border border-border bg-surface-2 px-2 py-1 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted">Progress:</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editCompletion}
                        onChange={(e) => setEditCompletion(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-16 rounded border border-border bg-surface-2 px-2 py-1 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <span className="text-xs text-muted">%</span>
                    </div>

                    <div className="ml-auto flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Badge tone={PRIORITY_TONE[displayedTask.priority]}>
                      {displayedTask.priority}
                    </Badge>
                    <span className="text-xs text-muted">
                      Due {formatDate(displayedTask.dueDate)}
                    </span>
                    {typeof displayedTask.completion === "number" && (
                      <span className="text-xs text-muted ml-auto font-medium">
                        {displayedTask.completion}% complete
                      </span>
                    )}
                  </>
                )}
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <section className="space-y-2 px-5 py-4">
                <h3 className="text-xs uppercase tracking-wide text-muted">
                  Description
                </h3>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 p-2.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Add a detailed description..."
                  />
                ) : displayedTask.description.trim() ? (
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
