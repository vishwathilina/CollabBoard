import type { WorkspaceCardProps } from "@/types/components";
import { AvatarGroup } from "@/components/ui/AvatarGroup";
import { Button } from "@/components/ui/Button";

export function WorkspaceCard({ workspace, members, onOpen }: WorkspaceCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: workspace.color }}
        />
        <h2 className="text-sm font-semibold text-fg">{workspace.name}</h2>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted">
        {workspace.description}
      </p>

      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        <div className="space-y-2">
          <AvatarGroup users={members} max={4} />
          <p className="text-xs text-muted">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <Button variant="primary" onClick={onOpen}>
          Open
        </Button>
      </div>
    </article>
  );
}
