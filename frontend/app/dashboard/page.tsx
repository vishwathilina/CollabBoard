"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceGrid } from "@/components/dashboard/WorkspaceGrid";
import { Button } from "@/components/ui/Button";
import { apiFetch, getToken } from "@/lib/api";
import type { Workspace, User } from "@/types";

const COLOR_SWATCHES = [
  "#C6F135",
  "#5B8DEF",
  "#E879F9",
  "#F59E0B",
  "#34D399",
  "#FB7185",
  "#818CF8",
  "#22D3EE",
];

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // New Workspace Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [wsColor, setWsColor] = useState("#C6F135");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const [wsData, meData] = await Promise.all([
        apiFetch<Workspace[]>("/api/workspaces", { token }),
        apiFetch<User>("/api/auth/me", { token }).catch(() => null),
      ]);
      setWorkspaces(wsData);
      setCurrentUser(meData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  // Only Project Managers, Senior Project Managers, or Admins can create workspaces
  const canCreateWorkspace =
    currentUser?.orgRole === "project_manager" ||
    currentUser?.orgRole === "senior_project_manager" ||
    currentUser?.orgRole === "admin";

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setCreating(true);

    const token = getToken();
    if (!token) return;

    try {
      const newWs = await apiFetch<Workspace>("/api/workspaces", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: wsName.trim(),
          description: wsDescription.trim(),
          color: wsColor,
        }),
      });

      setWorkspaces((prev) => [...prev, newWs]);
      setIsModalOpen(false);
      setWsName("");
      setWsDescription("");
      setWsColor("#C6F135");

      // Navigate to the newly created workspace
      router.push(`/workspace/${newWs.id}/tree`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">Workspaces</h2>
            <p className="text-xs text-muted">Select a workspace to enter or review</p>
          </div>

          {canCreateWorkspace && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <span>+</span>
              <span>New Workspace</span>
            </Button>
          )}
        </div>

        <WorkspaceGrid items={workspaces} />

        {/* Create Workspace Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-fg">Create New Workspace</h3>
              <p className="mt-1 text-xs text-muted">
                Define the project scope and assign workspace branding.
              </p>

              {errorMsg && (
                <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud Infrastructure Migration"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Brief description of the initiative and deliverables..."
                    value={wsDescription}
                    onChange={(e) => setWsDescription(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setWsColor(color)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          wsColor === color
                            ? "scale-110 border-white"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={creating || !wsName.trim() || !wsDescription.trim()}
                  >
                    {creating ? "Creating..." : "Create Workspace"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
