"use client";

import { useEffect, useState, use } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceViewTabs } from "@/components/layout/WorkspaceViewTabs";
import { apiFetch, getToken } from "@/lib/api";
import type { Workspace, User } from "@/types";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const loadData = async () => {
      try {
        const [ws, allUsers] = await Promise.all([
          apiFetch<Workspace>(`/api/workspaces/${id}`, { token }),
          apiFetch<User[]>("/api/users", { token }),
        ]);
        setWorkspace(ws);
        setMembers(allUsers.filter(u => ws.memberIds.includes(u.id)));
      } catch (err) {
        console.error(err);
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
        <div className="p-6 text-sm text-muted">Workspace not found or access denied</div>
      </>
    );
  }

  return (
    <>
      <TopBar title={workspace.name} members={members} />
      <WorkspaceViewTabs />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </>
  );
}
