"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { apiFetch, getToken, removeToken } from "@/lib/api";
import type { Workspace, User } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const dashboardActive = pathname === "/dashboard" || pathname === "/";

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const loadData = async () => {
      try {
        const [user, ws] = await Promise.all([
          apiFetch<User>("/api/auth/me", { token }),
          apiFetch<Workspace[]>("/api/workspaces", { token }),
        ]);
        setCurrentUser(user);
        setWorkspaces(ws);
      } catch (err) {
        console.error("Failed to load sidebar data", err);
      }
    };
    loadData();
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="h-6 w-6 rounded-md bg-accent" aria-hidden />
        <span className="text-sm font-semibold tracking-tight text-fg">CollabBoard</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <Link
          href="/dashboard"
          className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            dashboardActive
              ? "bg-surface-2 font-medium text-accent"
              : "text-fg hover:bg-surface-2"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          Dashboard
        </Link>

        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted">
          Workspaces
        </p>
        <ul className="space-y-1">
          {workspaces.map((workspace) => {
            const active = pathname.startsWith(`/workspace/${workspace.id}`);
            return (
              <li key={workspace.id}>
                <Link
                  href={`/workspace/${workspace.id}/tree`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-surface-2 font-medium text-accent"
                      : "text-fg hover:bg-surface-2"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: workspace.color }}
                    aria-hidden
                  />
                  <span className="truncate">{workspace.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 px-1">
          <Button variant="outline" size="sm" disabled className="w-full">
            New workspace
          </Button>
        </div>
      </nav>

      <div className="border-t border-border p-3">
        {currentUser ? (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <Avatar user={currentUser} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{currentUser.name}</p>
              <p className="text-xs text-muted">Signed in</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted hover:text-fg ml-auto"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
