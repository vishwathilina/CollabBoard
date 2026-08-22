import type { KanbanColumnProps } from "@/types/components";

export function KanbanColumn({ title, column, count, children }: KanbanColumnProps) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">
      <p>
        KanbanColumn stub — Member 5 ({title} / {column} / {count})
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
