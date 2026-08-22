"use client";

import { useRouter } from "next/navigation";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard";
import { getUsers } from "@/lib/format";
import { users } from "@/mocks/data";
import type { Workspace } from "@/types";

export function WorkspaceGrid({ items }: { items: Workspace[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No workspaces yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          members={getUsers(users, workspace.memberIds)}
          onOpen={() => router.push(`/workspace/${workspace.id}/tree`)}
        />
      ))}
    </div>
  );
}
