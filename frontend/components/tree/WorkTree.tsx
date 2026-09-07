"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
} from "lucide-react";
import { apiFetch, getToken } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  NestedTreeNodeRow,
  type TreeNodeItem,
} from "./NestedTreeNodeRow";
import type { TreeNode, Task, Workspace, User } from "@/types";

export function WorkTree({ workspaceId }: { workspaceId: string }) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expand / Collapse state (Set of node IDs that are expanded)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set()
  );

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    parentId: string | null;
    parentName: string;
  }>({
    open: false,
    parentId: null,
    parentName: "",
  });
  const [createName, setCreateName] = useState("");
  const [createCompletion, setCreateCompletion] = useState(0);

  const [editModal, setEditModal] = useState<{
    open: boolean;
    node: TreeNode | null;
  }>({
    open: false,
    node: null,
  });
  const [editName, setEditName] = useState("");
  const [editCompletion, setEditCompletion] = useState(0);

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    node: TreeNode | null;
    error: string | null;
  }>({
    open: false,
    node: null,
    error: null,
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Load tree nodes, workspace, tasks, and auth user
  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [treeData, wsData, tasksData, meData] = await Promise.all([
        apiFetch<TreeNode[]>(`/api/workspaces/${workspaceId}/tree`, { token }),
        apiFetch<Workspace>(`/api/workspaces/${workspaceId}`, { token }).catch(
          () => null
        ),
        apiFetch<Task[]>(`/api/workspaces/${workspaceId}/tasks`, {
          token,
        }).catch(() => []),
        apiFetch<User>("/api/auth/me", { token }).catch(() => null),
      ]);

      setNodes(treeData || []);
      if (wsData) setWorkspace(wsData);
      setTasks(tasksData || []);
      setCurrentUser(meData);

      // Default expand all nodes that have children
      const parentIdsWithChildren = new Set<string>();
      for (const n of treeData || []) {
        if (n.parentId) parentIdsWithChildren.add(n.parentId);
      }
      setExpandedNodeIds(parentIdsWithChildren);
    } catch (err: unknown) {
      console.error("Failed to load work tree data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load work tree."
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine user permissions
  const isSeniorPM =
    currentUser?.orgRole === "senior_project_manager" ||
    currentUser?.orgRole === "admin";
  const isOwner = workspace?.ownerId === currentUser?.id;
  const myMember = workspace?.members?.find((m) => m.userId === currentUser?.id);
  const isPM = myMember?.role === "owner" || myMember?.role === "project_manager";
  const canEditTree = Boolean(isSeniorPM || isOwner || isPM);

  // Scoped view detection (developer / designer with scoped visible nodes)
  const isScoped =
    !isSeniorPM &&
    !isOwner &&
    !isPM &&
    (myMember?.role === "developer" || myMember?.role === "designer");

  // Build hierarchical tree structure
  const hierarchyTree = useMemo(() => {
    const nodeMap = new Map<string, TreeNodeItem>();
    const roots: TreeNodeItem[] = [];

    // Map tasks count to each tree node
    const taskCountMap = new Map<string, number>();
    for (const t of tasks) {
      if (t.treeNodeId) {
        taskCountMap.set(t.treeNodeId, (taskCountMap.get(t.treeNodeId) || 0) + 1);
      }
    }

    // Initialize items
    for (const n of nodes) {
      nodeMap.set(n.id, {
        ...n,
        children: [],
        taskCount: taskCountMap.get(n.id) || 0,
        depth: 0,
      });
    }

    // Attach children to parents or identify roots
    for (const n of nodes) {
      const item = nodeMap.get(n.id)!;
      if (n.parentId && nodeMap.has(n.parentId)) {
        const parent = nodeMap.get(n.parentId)!;
        item.depth = parent.depth + 1;
        parent.children.push(item);
      } else {
        roots.push(item);
      }
    }

    // Recursively adjust depths for proper indentation
    function assignDepths(items: TreeNodeItem[], currentDepth: number) {
      for (const item of items) {
        item.depth = currentDepth;
        if (item.children.length > 0) {
          assignDepths(item.children, currentDepth + 1);
        }
      }
    }
    assignDepths(roots, 0);

    return roots;
  }, [nodes, tasks]);

  // Search filtering logic (returns items that match or have matching descendants)
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return hierarchyTree;

    const query = searchQuery.toLowerCase().trim();

    function filterNode(node: TreeNodeItem): TreeNodeItem | null {
      const nameMatches = node.name.toLowerCase().includes(query);
      const filteredChildren: TreeNodeItem[] = [];

      for (const child of node.children) {
        const matchingChild = filterNode(child);
        if (matchingChild) {
          filteredChildren.push(matchingChild);
        }
      }

      if (nameMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    }

    const result: TreeNodeItem[] = [];
    for (const root of hierarchyTree) {
      const matched = filterNode(root);
      if (matched) result.push(matched);
    }
    return result;
  }, [hierarchyTree, searchQuery]);

  // Expand / Collapse Handlers
  const toggleExpand = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = new Set<string>();
    for (const n of nodes) {
      if (n.parentId) allParentIds.add(n.parentId);
    }
    setExpandedNodeIds(allParentIds);
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Create Node Handler
  const handleOpenCreate = (parentId: string | null = null, parentName = "") => {
    setCreateModal({ open: true, parentId, parentName });
    setCreateName("");
    setCreateCompletion(0);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    const token = getToken();
    if (!token) return;

    setActionLoading(true);
    try {
      const created = await apiFetch<TreeNode>(
        `/api/workspaces/${workspaceId}/tree`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            name: createName.trim(),
            parentId: createModal.parentId,
            completion: createCompletion,
          }),
        }
      );

      // If created with a parent, make sure that parent is expanded
      if (createModal.parentId) {
        setExpandedNodeIds((prev) => new Set([...prev, createModal.parentId!]));
      }

      setNodes((prev) => [...prev, created]);
      setCreateModal({ open: false, parentId: null, parentName: "" });
    } catch (err: unknown) {
      console.error("Failed to create tree node:", err);
      alert(
        err instanceof Error ? err.message : "Failed to create work tree node."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Node Handler
  const handleOpenEdit = (node: TreeNode) => {
    setEditModal({ open: true, node });
    setEditName(node.name);
    setEditCompletion(node.completion);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.node || !editName.trim()) return;

    const token = getToken();
    if (!token) return;

    setActionLoading(true);
    try {
      const updated = await apiFetch<TreeNode>(
        `/api/tree-nodes/${editModal.node.id}`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({
            name: editName.trim(),
            completion: editCompletion,
          }),
        }
      );

      setNodes((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
      );
      setEditModal({ open: false, node: null });
    } catch (err: unknown) {
      console.error("Failed to update tree node:", err);
      alert(
        err instanceof Error ? err.message : "Failed to update work tree node."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Node Handler
  const handleOpenDelete = (node: TreeNode) => {
    setDeleteModal({ open: true, node, error: null });
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModal.node) return;

    const token = getToken();
    if (!token) return;

    setActionLoading(true);
    setDeleteModal((prev) => ({ ...prev, error: null }));

    try {
      await apiFetch<{ id: string; deleted: boolean }>(
        `/api/tree-nodes/${deleteModal.node.id}`,
        {
          method: "DELETE",
          token,
        }
      );

      setNodes((prev) => prev.filter((n) => n.id !== deleteModal.node?.id));
      setDeleteModal({ open: false, node: null, error: null });
    } catch (err: unknown) {
      console.error("Failed to delete tree node:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Cannot delete this node. Remove all child nodes and tasks first.";
      setDeleteModal((prev) => ({ ...prev, error: message }));
    } finally {
      setActionLoading(false);
    }
  };

  // Summary Metrics
  const totalNodes = nodes.length;
  const completedNodes = nodes.filter((n) => n.completion === 100).length;
  const avgCompletion =
    totalNodes > 0
      ? Math.round(
          nodes.reduce((acc, n) => acc + (n.completion || 0), 0) / totalNodes
        )
      : 0;

  // Recursive renderer for nested tree hierarchy
  const renderTreeNodes = (items: TreeNodeItem[]) => {
    return items.map((item) => {
      const isExpanded = expandedNodeIds.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.id} className="flex flex-col gap-2">
          <NestedTreeNodeRow
            node={item}
            workspaceId={workspaceId}
            isExpanded={isExpanded}
            canEdit={canEditTree}
            onToggleExpand={toggleExpand}
            onAddChild={(parentId, parentName) =>
              handleOpenCreate(parentId, parentName)
            }
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />

          {/* Children container with indent vertical line */}
          {hasChildren && isExpanded && (
            <div className="relative flex flex-col gap-2 pl-4 sm:pl-6">
              {/* Vertical guideline connector */}
              <div className="absolute top-0 bottom-2 left-2 sm:left-3 w-px bg-border/60" />
              {renderTreeNodes(item.children)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <span className="text-sm text-muted">Loading work tree hierarchy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <p className="text-sm font-medium text-danger">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Role-Scoped Notice Banner (For developers/designers) */}
      {isScoped && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
          <Info className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="flex-1">
            <span className="font-semibold text-blue-300">
              Role Scoped View:{" "}
            </span>
            <span>
              You are viewing assigned work tree phases and tasks according to your{" "}
              <strong className="capitalize">{myMember?.role}</strong> role.
              Out-of-scope phases are protected and omitted by the server.
            </span>
          </div>
        </div>
      )}

      {/* Summary KPI Cards & Controls */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Total Phases & Leaves</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-fg">
            {totalNodes}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Completed (100%)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-accent">
            {completedNodes}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Average Progress</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-fg">
            {avgCompletion}%
          </div>
          <div className="mt-2">
            <ProgressBar value={avgCompletion} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Total Tasks</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-fg">
            {tasks.length}
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Filter */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search phases and tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            <span>Expand All</span>
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            <span>Collapse All</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            aria-label="Refresh work tree"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {canEditTree && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreate(null, "")}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Phase</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Hierarchical Tree List */}
      {filteredTree.length === 0 ? (
        <div className="flex min-h-[35vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
          <FolderTree className="h-10 w-10 text-muted" />
          <div className="text-sm font-semibold text-fg">
            {searchQuery
              ? "No phases matched your search query."
              : "No phases or tasks in this workspace yet."}
          </div>
          <p className="max-w-md text-xs text-muted">
            {searchQuery
              ? "Try searching for a different keyword or clear your filter."
              : "The work tree provides a readable breakdown of your project phases, milestones, and task deliverables."}
          </p>
          {canEditTree && !searchQuery && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreate(null, "")}
              className="mt-2 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Phase</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {renderTreeNodes(filteredTree)}
        </div>
      )}

      {/* Modal: Create Node */}
      <Modal
        open={createModal.open}
        onClose={() =>
          !actionLoading &&
          setCreateModal({ open: false, parentId: null, parentName: "" })
        }
        title={
          createModal.parentId
            ? `Add Sub-phase under "${createModal.parentName}"`
            : "Add Root Phase"
        }
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-phase-name" className="text-xs font-semibold text-muted">
              Phase or Task Name <span className="text-danger">*</span>
            </label>
            <input
              id="create-phase-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Database Architecture, Frontend Integration"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-parent-select" className="text-xs font-semibold text-muted">Parent Phase</label>
            <select
              id="create-parent-select"
              value={createModal.parentId ?? ""}
              onChange={(e) =>
                setCreateModal((prev) => ({
                  ...prev,
                  parentId: e.target.value || null,
                  parentName:
                    nodes.find((n) => n.id === e.target.value)?.name || "",
                }))
              }
              className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg focus:border-accent focus:outline-none"
            >
              <option value="">None (Top-Level Root Phase)</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <label htmlFor="create-initial-completion">Initial Completion</label>
              <span className="tabular-nums">{createCompletion}%</span>
            </div>
            <input
              id="create-initial-completion"
              type="range"
              min={0}
              max={100}
              value={createCompletion}
              onChange={(e) => setCreateCompletion(Number(e.target.value))}
              className="accent-accent"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCreateModal({ open: false, parentId: null, parentName: "" })
              }
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={actionLoading || !createName.trim()}
            >
              {actionLoading ? "Creating..." : "Create Phase"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Node */}
      <Modal
        open={editModal.open}
        onClose={() =>
          !actionLoading && setEditModal({ open: false, node: null })
        }
        title={`Edit "${editModal.node?.name}"`}
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-phase-name" className="text-xs font-semibold text-muted">Phase Name</label>
            <input
              id="edit-phase-name"
              type="text"
              required
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <label htmlFor="edit-phase-completion">Completion</label>
              <span className="tabular-nums">{editCompletion}%</span>
            </div>
            <input
              id="edit-phase-completion"
              type="range"
              min={0}
              max={100}
              value={editCompletion}
              onChange={(e) => setEditCompletion(Number(e.target.value))}
              className="accent-accent"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModal({ open: false, node: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={actionLoading || !editName.trim()}
            >
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Node */}
      <Modal
        open={deleteModal.open}
        onClose={() =>
          !actionLoading &&
          setDeleteModal({ open: false, node: null, error: null })
        }
        title="Delete Work Tree Phase"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 shrink-0 text-danger" />
            <div className="flex-1 text-sm text-muted">
              Are you sure you want to delete{" "}
              <strong className="text-fg">{deleteModal.node?.name}</strong>?
              This action cannot be undone.
            </div>
          </div>

          {deleteModal.error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              {deleteModal.error}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDeleteModal({ open: false, node: null, error: null })
              }
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
