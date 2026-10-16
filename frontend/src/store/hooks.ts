import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { Item, Query, Relation, Spec } from "../domain";
import { type HistoryState, topics, type WorkspaceStore } from "./store";

const StoreContext = createContext<WorkspaceStore | null>(null);

export const StoreProvider = StoreContext.Provider;

export function useStore(): WorkspaceStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

/** Items for a view. Re-renders only when items of the query's type change. */
export function useQuery(query: Query): Item[] {
  const store = useStore();
  const key = JSON.stringify(query);
  const stable = useMemo(() => JSON.parse(key) as Query, [key]);
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(topics.type(stable.type), onChange),
    [store, stable.type],
  );
  return useSyncExternalStore(subscribe, () => store.query(stable));
}

/** One item. Re-renders only when that item changes. */
export function useItem(id: string): Item | undefined {
  const store = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(topics.item(id), onChange),
    [store, id],
  );
  return useSyncExternalStore(subscribe, () => store.item(id));
}

export function useRelations(itemId: string): readonly Relation[] {
  const store = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(topics.relations(itemId), onChange),
    [store, itemId],
  );
  return useSyncExternalStore(subscribe, () => store.relationsOf(itemId));
}

/** The workspace spec. Re-renders when the structure changes (edits, undo, AI). */
export function useWorkspaceSpec(): Spec | null {
  const store = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(topics.spec, onChange),
    [store],
  );
  return useSyncExternalStore(subscribe, () => store.spec);
}

export function useHistory(): HistoryState {
  const store = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(topics.history, onChange),
    [store],
  );
  return useSyncExternalStore(subscribe, () => store.history);
}
