export interface User {
  id: string;
  name: string;
  avatarColor: string; // hex, used when there is no photo
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  type: "image" | "pdf" | "doc" | "link";
  url: string;
  addedBy: string; // userId
}

export interface Message {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO
}

export type TaskColumn = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  workspaceId: string;
  treeNodeId: string;
  column: TaskColumn;
  title: string;
  description: string;
  priority: TaskPriority;
  memberIds: string[];
  startDate: string; // ISO — Gantt
  dueDate: string; // ISO — Gantt + cards
  completion: number; // 0-100
}

export interface TreeNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  completion: number; // 0-100
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  color: string; // hex accent on dashboard cards
}

export type WorkspaceView = "tree" | "board" | "gantt";
