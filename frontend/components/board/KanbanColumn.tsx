import type { KanbanColumnProps } from "@/types/components";

export function KanbanColumn({ title, column, count, children }: KanbanColumnProps) {
  return (
    <section className="flex w-72 min-w-[18rem] flex-col rounded-xl border border-border bg-surface-2 p-3">
      <header className="mb-3 flex items-center justify-between text-sm">
        <h2 className="font-semibold text-fg">
          {title} <span className="text-muted font-normal">· {count}</span>
        </h2>
        <button
          type="button"
          disabled
          aria-label="Add task"
          className="cursor-not-allowed text-muted opacity-50"
        >
          +
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}
