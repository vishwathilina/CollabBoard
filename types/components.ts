import type { ReactNode } from "react";
import type { User, Task, TreeNode, Workspace, TaskColumn } from "@/types";

export type ButtonProps = {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export type AvatarProps = {
  user: User;
  size?: "xs" | "sm" | "md" | "lg";
};

export type AvatarGroupProps = {
  users: User[];
  max?: number; // default 3
};

export type BadgeProps = {
  tone:
    | "priority-low"
    | "priority-medium"
    | "priority-high"
    | "priority-urgent"
    | "neutral"
    | "accent";
  children: ReactNode;
};

export type ProgressBarProps = {
  value: number; // 0-100
  className?: string;
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export type WorkspaceCardProps = {
  workspace: Workspace;
  members: User[];
  onOpen: () => void;
};

export type TreeNodeCardProps = {
  node: TreeNode;
  selected?: boolean;
  onClick?: () => void;
};

export type TreeConnectorLinesProps = {
  // SVG overlay; Member 3 passes layout boxes, Member 4 draws lines
  connections: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
  width: number;
  height: number;
};

export type TaskCardProps = {
  task: Task;
  members: User[];
  highlighted?: boolean;
  onClick: () => void;
};

export type KanbanColumnProps = {
  title: string;
  column: TaskColumn;
  count: number;
  children: ReactNode;
};

export type TaskDetailDrawerProps = {
  task: Task | null;
  open: boolean;
  onClose: () => void;
};

export type MessageChannelProps = {
  taskId: string;
};

export type AttachmentListProps = {
  taskId: string;
};

export type GanttChartProps = {
  workspaceId: string;
};
