"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TreeNode } from "@/types";

export interface TreeNodeItem extends TreeNode {
  children: TreeNodeItem[];
  taskCount: number;
  depth: number;
}

interface NestedTreeNodeRowProps {
  node: TreeNodeItem;
  workspaceId: string;
  isExpanded: boolean;
  canEdit: boolean;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (parentId: string, parentName: string) => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
}

export function NestedTreeNodeRow({
  node,
  workspaceId,
  isExpanded,
  canEdit,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
}: NestedTreeNodeRowProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const isComplete = node.completion === 100;

  const handleLeafClick = () => {
    if (isLeaf) {
      router.push(`/workspace/${workspaceId}/board?treeNode=${node.id}`);
    } else {
      onToggleExpand(node.id);
    }
  };

  // Depth indent: 24px per level on desktop, 16px on mobile
  const indentPadding = `${Math.min(node.depth, 6) * 1.5}rem`;

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border bg-surface transition-all duration-150 hover:border-border/80 hover:bg-surface/90"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
        style={{ paddingLeft: `max(0.75rem, ${indentPadding})` }}
      >
        {/* Left Side: Expand toggle, Icon, Title, Badges */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Chevron / Toggle for branch nodes */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand(node.id)}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-150" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-150" />
              )}
            </button>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center text-muted/60">
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
            </div>
          )}

          {/* Node Icon */}
          <div className="shrink-0 text-muted">
            {node.depth === 0 ? (
              <span className="flex h-6 w-6 items-center justify-center rounded bg-accent/15 text-xs font-bold text-accent">
                {node.name.charAt(0).toUpperCase()}
              </span>
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-accent/80" />
              ) : (
                <Folder className="h-4 w-4 text-muted" />
              )
            ) : isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-accent" />
            ) : (
              <FileCode className="h-4 w-4 text-muted" />
            )}
          </div>

          {/* Title & Type Badge */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLeafClick}
                className={`truncate text-left text-sm font-semibold transition-colors ${
                  isLeaf
                    ? "text-fg hover:text-accent hover:underline cursor-pointer"
                    : "text-fg hover:text-accent cursor-pointer"
                }`}
                title={node.name}
              >
                {node.name}
              </button>

              {/* Type Chip */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  node.depth === 0
                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                    : hasChildren
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    : "bg-accent/15 text-accent border border-accent/30"
                }`}
              >
                {node.depth === 0 ? "Root" : hasChildren ? "Phase" : "Leaf"}
              </span>

              {/* Task Count Chip */}
              <span className="inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                {node.taskCount} {node.taskCount === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Progress Bar + Action Buttons */}
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          {/* Progress Bar & Percentage */}
          <div className="flex w-36 items-center gap-2 sm:w-44">
            <div className="flex-1">
              <ProgressBar value={node.completion} />
            </div>
            <span
              className={`w-9 text-right text-xs font-semibold tabular-nums ${
                isComplete ? "text-accent" : "text-muted"
              }`}
            >
              {node.completion}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Open Board for Leaf Node */}
            {isLeaf && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/workspace/${workspaceId}/board?treeNode=${node.id}`
                  )
                }
                className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-accent hover:text-on-accent"
                title="View tasks on Kanban board"
              >
                <span>Board</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}

            {/* PM / Owner Actions */}
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAddChild(node.id, node.name)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-accent"
                  title="Add sub-phase or child task leaf"
                  aria-label="Add sub-phase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onEdit(node)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  title="Rename / Edit completion"
                  aria-label="Edit node"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(node)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/15 hover:text-danger"
                  title="Delete phase (must have no children or tasks)"
                  aria-label="Delete node"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
