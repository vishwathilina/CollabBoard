import type { TreeNodeCardProps } from "@/types/components";

export function TreeNodeCard({ node, selected, onClick }: TreeNodeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border border-dashed border-border bg-surface p-4 text-left text-sm text-muted ${
        selected ? "ring-1 ring-accent" : ""
      }`}
    >
      TreeNodeCard stub — Member 4 ({node.name})
    </button>
  );
}
