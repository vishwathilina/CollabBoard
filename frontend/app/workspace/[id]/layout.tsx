"use client";

import { useEffect, useState, use } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceViewTabs } from "@/components/layout/WorkspaceViewTabs";
import {
  WorkspaceRealtimeProvider,
  useWorkspaceRealtime,
} from "@/components/realtime/WorkspaceRealtimeContext";
import { WorkspaceChatDrawer } from "@/components/chat/WorkspaceChatDrawer";
import { apiFetch, getToken } from "@/lib/api";
import type { Workspace, User } from "@/types";

interface WorkspaceLayoutContentProps {
  workspace: Workspace;
  members: User[];
  currentUser: User | null;
  canManage: boolean;
  isViewer: boolean;
  children: React.ReactNode;
}

function WorkspaceLayoutContent({
  workspace,
  members,
  currentUser,
  canManage,
  isViewer,
  children,
}: WorkspaceLayoutContentProps) {
  const { onlineUsers, setIsChatOpen } = useWorkspaceRealtime();

  return (
    <>
      <TopBar
        title={workspace.name}
        members={members}
        onlineUsers={onlineUsers}
        onOpenChat={() => setIsChatOpen(true)}
      />
      <WorkspaceViewTabs canManageSettings={canManage} />
      <div className="flex-1 overflow-auto p-6">{children}</div>
      <WorkspaceChatDrawer currentUser={currentUser} isViewer={isViewer} />
    </>
  );
}

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const loadData = async () => {
      try {
        const [ws, allUsers, me] = await Promise.all([
          apiFetch<Workspace>(`/api/workspaces/${id}`, { token }),
          apiFetch<User[]>("/api/users", { token }),
          apiFetch<User>("/api/auth/me", { token }).catch(() => null),
        ]);
        setWorkspace(ws);
        setMembers(allUsers.filter((u) => (ws.memberIds || []).includes(u.id)));
        setCurrentUser(me);
      } catch (err) {
        console.error("Failed to load workspace layout data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <>
        <TopBar title="Loading Workspace..." />
        <WorkspaceViewTabs />
        <div className="flex-1 p-6 text-sm text-muted">Loading...</div>
      </>
    );
  }

  if (!workspace) {
    return (
      <>
        <TopBar title="Workspace" />
        <div className="p-6 text-sm text-muted">
          Workspace not found or access denied
        </div>
      </>
    );
  }

  const isSeniorPM =
    currentUser?.orgRole === "senior_project_manager" ||
    currentUser?.orgRole === "admin";
  const isOwner = workspace.ownerId === currentUser?.id;
  const myMember = workspace.members?.find((m) => m.userId === currentUser?.id);
  const isPM = myMember?.role === "owner" || myMember?.role === "project_manager";
  const canManage = Boolean(isSeniorPM || isOwner || isPM);
  const isViewer = Boolean(!isSeniorPM && !isOwner && myMember?.role === "viewer");

  return (
    <WorkspaceRealtimeProvider workspaceId={id} currentUser={currentUser}>
      <WorkspaceLayoutContent
        workspace={workspace}
        members={members}
        currentUser={currentUser}
        canManage={canManage}
        isViewer={isViewer}
      >
        {children}
      </WorkspaceLayoutContent>
    </WorkspaceRealtimeProvider>
  );
}
