"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { apiFetch, getToken } from "@/lib/api";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  User,
  TreeNode,
} from "@/types";

const ROLE_CONFIG: Record<
  WorkspaceRole,
  { label: string; badgeClass: string; description: string }
> = {
  owner: {
    label: "Owner",
    badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    description: "Full workspace administrative control and tree management",
  },
  project_manager: {
    label: "Project Manager",
    badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    description: "Manage members, phases, tasks, and settings",
  },
  developer: {
    label: "Developer",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    description: "Scoped access to assigned work tree phases and tasks",
  },
  designer: {
    label: "Designer",
    badgeClass: "bg-pink-500/15 text-pink-400 border border-pink-500/30",
    description: "Scoped access to design phases and UI tasks",
  },
  qa: {
    label: "QA Engineer",
    badgeClass: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
    description: "Full tree read; drag tasks into Review and Done",
  },
  viewer: {
    label: "Viewer",
    badgeClass: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    description: "Read-only access across the board and tree",
  },
};

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = use(params);
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Form State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [customEmail, setCustomEmail] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("developer");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit Visibility Modal State
  const [editingMember, setEditingMember] = useState<{
    userId: string;
    name: string;
    visibleTreeNodeIds: string[];
  } | null>(null);
  const [modalNodeIds, setModalNodeIds] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const loadAll = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const [ws, users, me, nodes] = await Promise.all([
        apiFetch<Workspace>(`/api/workspaces/${workspaceId}`, { token }),
        apiFetch<User[]>("/api/users", { token }),
        apiFetch<User>("/api/auth/me", { token }).catch(() => null),
        apiFetch<TreeNode[]>(`/api/workspaces/${workspaceId}/tree`, { token }).catch(() => []),
      ]);

      setWorkspace(ws);
      setAllUsers(users);
      setCurrentUser(me);
      setTreeNodes(nodes);
    } catch (err: unknown) {
      console.error("Failed to load settings data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [workspaceId]);

  if (loading) {
    return <div className="p-8 text-sm text-muted">Loading workspace settings...</div>;
  }

  // RBAC Permission Check
  const isSeniorPM =
    currentUser?.orgRole === "senior_project_manager" ||
    currentUser?.orgRole === "admin";
  const isOwner = workspace?.ownerId === currentUser?.id;
  const myMember = workspace?.members?.find((m) => m.userId === currentUser?.id);
  const isPM = myMember?.role === "owner" || myMember?.role === "project_manager";
  const canManage = Boolean(isSeniorPM || isOwner || isPM);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-8">
          <div className="mb-3 text-3xl">🛡️</div>
          <h2 className="mb-2 text-lg font-semibold text-fg">Access Denied</h2>
          <p className="mb-6 text-sm text-muted">
            You do not have permission to view or manage settings for this workspace. Only
            workspace owners and Project Managers can manage members.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push(`/workspace/${workspaceId}/board`)}
          >
            Back to Workspace Board
          </Button>
        </div>
      </div>
    );
  }

  // Users available to invite (not already members)
  const existingMemberIds = new Set(
    workspace?.members?.map((m) => m.userId) || workspace?.memberIds || []
  );
  const availableUsersToInvite = allUsers.filter((u) => !existingMemberIds.has(u.id));

  // Quick select helper for tree node multi-select
  const selectEngineeringOnly = (setter: (ids: string[]) => void) => {
    const engineeringIds = treeNodes
      .filter((node) => {
        const lower = node.name.toLowerCase();
        return (
          lower.includes("engineering") ||
          lower.includes("api") ||
          lower.includes("frontend") ||
          lower.includes("backend") ||
          node.parentId === "tn-engineering" ||
          node.id === "tn-engineering"
        );
      })
      .map((n) => n.id);
    setter(engineeringIds);
  };

  const toggleNodeSelection = (
    nodeId: string,
    currentIds: string[],
    setter: (ids: string[]) => void
  ) => {
    if (currentIds.includes(nodeId)) {
      setter(currentIds.filter((id) => id !== nodeId));
    } else {
      setter([...currentIds, nodeId]);
    }
  };

  // Handle Invite Form Submission
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setInviteLoading(true);

    const token = getToken();
    if (!token) return;

    try {
      const payload: {
        userId?: string;
        email?: string;
        role: WorkspaceRole;
        visibleTreeNodeIds?: string[];
      } = {
        role: selectedRole,
      };

      if (selectedUserId) {
        payload.userId = selectedUserId;
      } else if (customEmail.trim()) {
        payload.email = customEmail.trim();
      } else {
        throw new Error("Please select a registered user or enter an email address.");
      }

      if (selectedRole === "developer" || selectedRole === "designer") {
        payload.visibleTreeNodeIds = selectedNodeIds;
      }

      await apiFetch<Workspace>(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      setFeedback({
        text: "Member successfully invited to workspace!",
        type: "success",
      });

      // Reset form
      setSelectedUserId("");
      setCustomEmail("");
      setSelectedRole("developer");
      setSelectedNodeIds([]);

      // Reload
      await loadAll();
    } catch (err: unknown) {
      setFeedback({
        text: err instanceof Error ? err.message : "Failed to invite member",
        type: "error",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    const token = getToken();
    if (!token) return;

    try {
      await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ role: newRole }),
      });
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  // Handle Member Removal
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
        token,
      });
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  // Open Edit Visibility Modal
  const openEditVisibilityModal = (member: WorkspaceMember, user?: User) => {
    setEditingMember({
      userId: member.userId,
      name: user?.name || member.userId,
      visibleTreeNodeIds: member.visibleTreeNodeIds || [],
    });
    setModalNodeIds(member.visibleTreeNodeIds || []);
  };

  // Save Visibility from Modal
  const handleSaveVisibility = async () => {
    if (!editingMember) return;
    setModalLoading(true);
    const token = getToken();
    if (!token) return;

    try {
      await apiFetch(`/api/workspaces/${workspaceId}/members/${editingMember.userId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ visibleTreeNodeIds: modalNodeIds }),
      });
      setEditingMember(null);
      await loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update node visibility");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-fg">Workspace Settings & Members</h1>
        <p className="mt-1 text-sm text-muted">
          Manage member access, assign workspace roles, and configure work tree visibility.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            feedback.type === "success"
              ? "border-accent/40 bg-accent/10 text-fg"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Grid: Members List & Invite Form */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 spans): Members List */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-fg">Workspace Members</h2>
                <p className="text-xs text-muted">
                  Total {workspace?.members?.length || 0} active members
                </p>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {workspace?.members?.map((member) => {
                const user = allUsers.find((u) => u.id === member.userId);
                const roleInfo = ROLE_CONFIG[member.role] || {
                  label: member.role,
                  badgeClass: "bg-surface-2 text-fg border-border",
                  description: "",
                };
                const isMemberOwner = workspace.ownerId === member.userId;
                const isScopedRole = member.role === "developer" || member.role === "designer";
                const scopedCount = member.visibleTreeNodeIds?.length || 0;

                return (
                  <div
                    key={member.userId}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <Avatar
                        user={
                          user || {
                            id: member.userId,
                            name: member.userId,
                            email: "",
                            avatarColor: "#5B8DEF",
                          }
                        }
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-fg">
                            {user?.name || member.userId}
                          </span>
                          {currentUser?.id === member.userId && (
                            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">{user?.email || "No email"}</p>
                      </div>
                    </div>

                    {/* Role & Actions */}
                    <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                      {/* Scoped Visibility Pill for Developer/Designer */}
                      {isScopedRole && (
                        <button
                          type="button"
                          onClick={() => openEditVisibilityModal(member, user)}
                          className="group flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted hover:border-accent/40 hover:text-fg"
                          title="Click to view and edit allowed tree phases"
                        >
                          <span>
                            {scopedCount === 0
                              ? "⚠️ No phases"
                              : `🔭 ${scopedCount} phase${scopedCount > 1 ? "s" : ""}`}
                          </span>
                          <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100">
                            Edit
                          </span>
                        </button>
                      )}

                      {/* Role Selector or Badge */}
                      {isMemberOwner ? (
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${roleInfo.badgeClass}`}
                        >
                          Owner
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.userId, e.target.value as WorkspaceRole)
                          }
                          className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs font-medium text-fg hover:border-accent focus:outline-none"
                        >
                          <option value="project_manager">Project Manager</option>
                          <option value="developer">Developer</option>
                          <option value="designer">Designer</option>
                          <option value="qa">QA Engineer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}

                      {/* Remove Button */}
                      {!isMemberOwner && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(member.userId, user?.name || member.userId)
                          }
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Invite Form */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-1 text-base font-medium text-fg">Invite Member</h2>
            <p className="mb-4 text-xs text-muted">
              Add a teammate by choosing an existing registered user or entering their email.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              {/* Select Existing User */}
              {availableUsersToInvite.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Select Registered User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (e.target.value) setCustomEmail("");
                    }}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  >
                    <option value="">-- Choose from registered users --</option>
                    {availableUsersToInvite.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Or Enter Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Or Invite by Email
                </label>
                <input
                  type="email"
                  placeholder="name@collabboard.local"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    if (e.target.value) setSelectedUserId("");
                  }}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Workspace Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    const r = e.target.value as WorkspaceRole;
                    setSelectedRole(r);
                    // Pre-select engineering when selecting developer
                    if (r === "developer" && selectedNodeIds.length === 0) {
                      selectEngineeringOnly(setSelectedNodeIds);
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  <option value="project_manager">Project Manager</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="qa">QA Engineer</option>
                  <option value="viewer">Viewer</option>
                </select>
                <p className="mt-1 text-[11px] text-muted">
                  {ROLE_CONFIG[selectedRole]?.description}
                </p>
              </div>

              {/* Tree Node Multi-Select (for Developer & Designer) */}
              {(selectedRole === "developer" || selectedRole === "designer") && (
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-fg">
                      Scoped Work Tree Phases
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectEngineeringOnly(setSelectedNodeIds)}
                        className="text-[10px] font-medium text-accent hover:underline"
                      >
                        Engineering Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedNodeIds(treeNodes.map((n) => n.id))}
                        className="text-[10px] text-muted hover:text-fg"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedNodeIds([])}
                        className="text-[10px] text-muted hover:text-fg"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className="mb-2.5 text-[11px] text-muted">
                    Developers and Designers only see selected phases and their associated
                    tasks.
                  </p>

                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {treeNodes.length === 0 ? (
                      <p className="text-xs text-muted">No tree nodes found.</p>
                    ) : (
                      treeNodes.map((node) => {
                        const checked = selectedNodeIds.includes(node.id);
                        const isChild = Boolean(node.parentId);

                        return (
                          <label
                            key={node.id}
                            className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-surface ${
                              isChild ? "ml-3 border-l border-border pl-2" : "font-medium"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleNodeSelection(
                                  node.id,
                                  selectedNodeIds,
                                  setSelectedNodeIds
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-border accent-[#C6F135]"
                            />
                            <span className={checked ? "text-accent" : "text-fg"}>
                              {node.name}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={inviteLoading || (!selectedUserId && !customEmail.trim())}
              >
                {inviteLoading ? "Inviting..." : "Send Invite"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Visibility Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-fg">
              Edit Scoped Visibility: {editingMember.name}
            </h3>
            <p className="mt-1 text-xs text-muted">
              Select which tree nodes and phases this member is allowed to see and manage.
            </p>

            <div className="my-4 flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-medium text-fg">Tree Nodes</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectEngineeringOnly(setModalNodeIds)}
                  className="text-xs text-accent hover:underline"
                >
                  Engineering Only
                </button>
                <button
                  type="button"
                  onClick={() => setModalNodeIds(treeNodes.map((n) => n.id))}
                  className="text-xs text-muted hover:text-fg"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setModalNodeIds([])}
                  className="text-xs text-muted hover:text-fg"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
              {treeNodes.map((node) => {
                const checked = modalNodeIds.includes(node.id);
                const isChild = Boolean(node.parentId);

                return (
                  <label
                    key={node.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-surface-2 ${
                      isChild ? "ml-4 border-l border-border pl-2" : "font-medium"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleNodeSelection(node.id, modalNodeIds, setModalNodeIds)
                      }
                      className="h-3.5 w-3.5 rounded border-border accent-[#C6F135]"
                    />
                    <span className={checked ? "text-accent font-medium" : "text-fg"}>
                      {node.name}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setEditingMember(null)}
                disabled={modalLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveVisibility}
                disabled={modalLoading}
              >
                {modalLoading ? "Saving..." : "Save Visibility"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
