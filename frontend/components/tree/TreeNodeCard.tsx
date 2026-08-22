import type { TreeNodeCardProps } from "@/types/components";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function TreeNodeCard({ node, selected, onClick }: TreeNodeCardProps) {
  const CardWrapper = onClick ? "button" : "div";
  
  return (
    <CardWrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? node.name : undefined}
      className={`flex h-[88px] w-[220px] flex-col justify-between rounded-xl border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
        selected ? "border-accent" : "border-border"
      }`}
    >
      <div className="w-full truncate text-sm font-semibold">{node.name}</div>
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Completion</span>
          <span>{node.completion}%</span>
        </div>
        <ProgressBar value={node.completion} />
      </div>
    </CardWrapper>
  );
}
