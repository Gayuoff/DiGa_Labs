import { type ComponentType, lazy, type LazyExoticComponent } from "react";
import type { Display } from "@/domain";
import type { RendererProps } from "./types";

type Renderer = LazyExoticComponent<ComponentType<RendererProps>>;

/** Each renderer is its own chunk, so a page downloads only the displays it shows. */
const RENDERERS: Partial<Record<Display, Renderer>> = {
  list: lazy(() => import("./list/ListView")),
  board: lazy(() => import("./board/BoardView")),
  table: lazy(() => import("./table/TableView")),
  calendar: lazy(() => import("./calendar/CalendarView")),
  doc: lazy(() => import("./doc/DocView")),
};

export function rendererFor(display: Display): Renderer | undefined {
  return RENDERERS[display];
}
