import type { ProgressBarProps } from "@/types/components";

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-2 ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${clamped}%` }} />
    </div>
  );
}
