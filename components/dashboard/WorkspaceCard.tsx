import type { WorkspaceCardProps } from "@/types/components";

export function WorkspaceCard({ workspace, members, onOpen }: WorkspaceCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-dashed border-border bg-surface p-6 text-left text-sm text-muted"
    >
      WorkspaceCard stub — Member 2 ({workspace.name}, {members.length} members)
    </button>
  );
}
