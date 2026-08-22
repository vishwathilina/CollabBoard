"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const tabs = [
  { view: "tree", label: "Tree" },
  { view: "board", label: "Board" },
  { view: "gantt", label: "Gantt" },
] as const;

export function WorkspaceViewTabs() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const workspaceId = params.id;

  return (
    <div className="flex gap-4 border-b border-border px-6">
      {tabs.map((tab) => {
        const href = `/workspace/${workspaceId}/${tab.view}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.view}
            href={href}
            className={`-mb-px border-b-2 py-2.5 text-sm ${
              active
                ? "border-accent font-medium text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
