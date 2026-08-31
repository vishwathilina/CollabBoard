"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceGrid } from "@/components/dashboard/WorkspaceGrid";
import { apiFetch, getToken } from "@/lib/api";
import type { Workspace } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const data = await apiFetch<Workspace[]>("/api/workspaces", { token });
        setWorkspaces(data);
      } catch (err) {
        console.error("Failed to load workspaces:", err);
        // If unauthorized, redirect to login
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [router]);

  if (loading) {
    return (
      <>
        <TopBar title="Dashboard" />
        <div className="flex-1 overflow-auto p-6 text-sm text-muted">
          Loading workspaces...
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <p className="mb-4 text-sm text-muted">Select a workspace</p>
        <WorkspaceGrid items={workspaces} />
      </div>
    </>
  );
}
