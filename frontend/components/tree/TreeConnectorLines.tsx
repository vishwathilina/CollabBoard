import type { TreeConnectorLinesProps } from "@/types/components";

export function TreeConnectorLines({ connections, width, height }: TreeConnectorLinesProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0"
    >
      {connections.map((conn, i) => {
        const midY = (conn.from.y + conn.to.y) / 2;
        const pathData = `M ${conn.from.x} ${conn.from.y} L ${conn.from.x} ${midY} L ${conn.to.x} ${midY} L ${conn.to.x} ${conn.to.y}`;
        
        return (
          <path
            key={i}
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="text-border"
          />
        );
      })}
    </svg>
  );
}
