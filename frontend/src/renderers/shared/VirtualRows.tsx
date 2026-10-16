import { useVirtualizer } from "@tanstack/react-virtual";
import { Fragment, type ReactNode, useRef } from "react";

/** Up to this many rows render normally (simpler DOM, find-in-page works); beyond it, virtualised. */
const VIRTUALIZE_ABOVE = 60;

interface VirtualRowsProps {
  count: number;
  estimateSize: number;
  getKey: (index: number) => string;
  renderRow: (index: number) => ReactNode;
  className?: string;
}

/** A scrolling list that draws only the visible rows once it gets long. */
export function VirtualRows(props: VirtualRowsProps) {
  if (props.count <= VIRTUALIZE_ABOVE) {
    return (
      <div className={props.className}>
        {Array.from({ length: props.count }, (_, index) => (
          <Fragment key={props.getKey(index)}>{props.renderRow(index)}</Fragment>
        ))}
      </div>
    );
  }
  return <Virtualized {...props} />;
}

function Virtualized({ count, estimateSize, getKey, renderRow, className }: VirtualRowsProps) {
  const parent = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parent.current,
    estimateSize: () => estimateSize,
    getItemKey: getKey,
    overscan: 10,
  });
  return (
    <div ref={parent} className={className}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${row.start}px)` }}
          >
            {renderRow(row.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
