import type { BadgeProps } from "@/types/components";

const toneClass: Record<BadgeProps["tone"], string> = {
  "priority-low": "bg-surface-2 text-muted",
  "priority-medium": "bg-amber-500/15 text-amber-300",
  "priority-high": "bg-orange-500/15 text-orange-300",
  "priority-urgent": "bg-danger/15 text-danger",
  neutral: "bg-surface-2 text-fg",
  accent: "bg-accent/15 text-accent",
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
