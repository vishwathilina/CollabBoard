"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiFetch, getToken } from "@/lib/api";
import type { Task, TaskColumn, TaskPriority, TreeNode, User } from "@/types";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  defaultColumn: TaskColumn;
  defaultTreeNodeId?: string | null;
  treeNodes: TreeNode[];
  users: User[];
  onTaskCreated: (task: Task) => void;
}

const COLUMN_LABELS: Record<TaskColumn, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export function CreateTaskModal({
  open,
  onClose,
  workspaceId,
  defaultColumn,
  defaultTreeNodeId,
  treeNodes,
  users,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [column, setColumn] = useState<TaskColumn>(defaultColumn);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [treeNodeId, setTreeNodeId] = useState<string>("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setColumn(defaultColumn);
      setPriority("medium");
      setMemberIds([]);
      setError(null);

      // Default due date: 7 days from today
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().slice(0, 10));

      if (defaultTreeNodeId) {
        setTreeNodeId(defaultTreeNodeId);
      } else if (treeNodes.length > 0) {
        setTreeNodeId(treeNodes[0].id);
      }
    }
  }, [open, defaultColumn, defaultTreeNodeId, treeNodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!treeNodeId) {
      setError("Please select a work tree node for this task.");
      return;
    }

    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    const now = new Date().toISOString();
    const formattedDueDate = dueDate
      ? new Date(dueDate).toISOString()
      : new Date(Date.now() + 7 * 86400000).toISOString();

    try {
      const created = await apiFetch<Task>(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        token,
        body: JSON.stringify({
          treeNodeId,
          column,
          title: title.trim(),
          description: description.trim(),
          priority,
          memberIds,
          startDate: now,
          dueDate: formattedDueDate,
          completion: 0,
        }),
      });

      onTaskCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`Create Task in ${COLUMN_LABELS[column] || "Board"}`}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Title *</label>
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design responsive navbar"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, requirements, acceptance criteria..."
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Column</label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value as TaskColumn)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Work Tree Phase / Node *</label>
            <select
              value={treeNodeId}
              onChange={(e) => setTreeNodeId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {treeNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {users.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Assignees</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-border rounded-lg bg-surface-2/40">
              {users.map((user) => {
                const isSelected = memberIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleMember(user.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                      isSelected
                        ? "bg-accent text-bg font-medium"
                        : "bg-surface text-muted hover:text-fg hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: user.avatarColor || "#ccc" }}
                    />
                    <span>{user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
