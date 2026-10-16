import { type RefObject, useMemo } from "react";
import { GridLayout, type Layout, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import type { Page } from "@/domain";
import { densityScale } from "@/design/tokens";
import { moveBlocks } from "@/spec/ops";
import { useEditSpec } from "./editSpec";
import { useSpec } from "./spec";
import { ViewFrame } from "./ViewFrame";

/**
 * The page grid in edit mode: drag views by their header, resize from the corner. Sizes match the
 * normal page grid exactly, so nothing jumps when editing starts or ends. Each drop or resize is
 * one spec change (one undo step). Loaded only when someone edits a layout.
 */
export default function LayoutEditor({ page }: { page: Page }) {
  const spec = useSpec();
  const edit = useEditSpec();
  const { width, containerRef, mounted } = useContainerWidth();
  const density = densityScale(spec.theme.density);
  const rowHeight = Math.round(36 * density); // --row-h: 2.25rem
  const gap = Math.round(12 * density); // grid gap: 0.75 × --pad

  const layout = useMemo<Layout>(
    () => page.blocks.map((b) => ({ i: b.view, x: b.x, y: b.y, w: b.w, h: b.h, minW: 2, minH: 3 })),
    [page.blocks],
  );

  const commit = (next: Layout) => {
    const placements = next.map((l) => ({ view: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
    edit((s) => moveBlocks(s, page.key, placements));
  };

  return (
    // The library types its ref for React 19; under React 18 it is the same object.
    <div ref={containerRef as RefObject<HTMLDivElement>}>
      {mounted && (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols: 12, rowHeight, margin: [gap, gap], containerPadding: [0, 0] }}
          dragConfig={{ handle: ".sb-drag-handle", cancel: "button, input, textarea, select, a" }}
          resizeConfig={{ handles: ["se"] }}
          onDragStop={commit}
          onResizeStop={commit}
        >
          {page.blocks.map((block) => {
            const view = spec.views.find((v) => v.key === block.view);
            return (
              <div key={block.view}>
                {view && <ViewFrame view={view} pageKey={page.key} editing />}
              </div>
            );
          })}
        </GridLayout>
      )}
    </div>
  );
}
