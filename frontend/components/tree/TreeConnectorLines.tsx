import type { TreeConnectorLinesProps } from "@/types/components";

export function TreeConnectorLines({ connections, width, height }: TreeConnectorLinesProps) {
  return (
    <svg
      width={width}
      height={height}
      className="rounded-xl border border-dashed border-border text-muted"
    >
      <text x="12" y="24" className="fill-current text-sm">
        TreeConnectorLines stub — Member 4 ({connections.length} links)
      </text>
    </svg>
  );
}
