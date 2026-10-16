import type { Item, ObjectType, View } from "@/domain";

/** What every renderer receives: the view config, its item type, and the query's live results. */
export interface RendererProps {
  view: View;
  type: ObjectType;
  items: Item[];
}
