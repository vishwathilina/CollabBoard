export type GanttRowProps = {
  title: string;
  leftPercent: number;
  widthPercent: number;
  rangeLabel: string;
  gridlinePercents: number[];
};

export function GanttRow({
  title,
  leftPercent,
  widthPercent,
  rangeLabel,
  gridlinePercents,
}: GanttRowProps) {
  return (
    <div className="flex items-center border-t border-border">
      <div className="sticky left-0 z-10 w-48 shrink-0 truncate bg-surface px-3 py-2 text-sm text-fg">
        {title}
      </div>
      <div className="relative h-8 min-w-0 flex-1">
        {gridlinePercents.map((percent) => (
          <span
            key={percent}
            aria-hidden
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: `${percent}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-accent/80"
          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
          title={`${title} · ${rangeLabel}`}
          aria-label={`${title}, ${rangeLabel}`}
        />
      </div>
    </div>
  );
}
