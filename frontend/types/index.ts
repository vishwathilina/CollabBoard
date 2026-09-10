export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string; // hex, used when there is no photo
  orgRole?: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  type: "image" | "pdf" | "doc" | "link";
  url: string;
  fileKey?: string | null;
  addedBy: string; // userId
  createdAt?: string;
  updatedAt?: string;
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
  version?: number;
  order?: number;
  updatedBy?: string | null;
}

export interface TreeNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  completion: number; // 0-100
}

export type WorkspaceRole =
  | "owner"
  | "project_manager"
  | "developer"
  | "designer"
  | "qa"
  | "viewer";

export type OrgRole =
  | "senior_project_manager"
  | "project_manager"
  | "developer"
  | "designer"
  | "qa"
  | "stakeholder"
  | "admin";

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  visibleTreeNodeIds?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string; // hex accent on dashboard cards
  ownerId?: string;
  members?: WorkspaceMember[];
  memberIds: string[];
}

export type WorkspaceView = "tree" | "board" | "gantt" | "settings";
