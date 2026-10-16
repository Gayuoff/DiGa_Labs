import type { Event, Item, Relation } from "../domain";

export interface Snapshot {
  items: Item[];
  relations: Relation[];
  /** Events not yet confirmed by the server, oldest first. */
  outbox: Event[];
}

/** Everything one committed batch changed, written atomically. */
export interface Change {
  items: Item[];
  relations: Relation[];
  removedRelationIds: string[];
  events: Event[];
}

/** Durable local storage for a workspace. The store works without one (e.g. previews, tests). */
export interface Persistence {
  load(workspaceId: string): Promise<Snapshot>;
  write(change: Change): Promise<void>;
  removeFromOutbox(eventIds: string[]): Promise<void>;
}

const DB_NAME = "second-brain";
const DB_VERSION = 1;
const STORES = ["items", "relations", "outbox"] as const;

/** IndexedDB persistence: the app opens instantly from local data and keeps working offline. */
export function indexedDbPersistence(
  factory: IDBFactory = indexedDB,
  name: string = DB_NAME,
): Persistence {
  let connection: Promise<IDBDatabase> | null = null;
  const db = () => (connection ??= open(factory, name));

  return {
    async load(workspaceId) {
      const tx = (await db()).transaction(STORES, "readonly");
      const byWorkspace = <T>(store: (typeof STORES)[number]) =>
        request<T[]>(tx.objectStore(store).index("workspaceId").getAll(workspaceId));
      const [items, relations, outbox] = await Promise.all([
        byWorkspace<Item>("items"),
        byWorkspace<Relation>("relations"),
        byWorkspace<Event>("outbox"),
      ]);
      outbox.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return { items, relations, outbox };
    },

    async write(change) {
      const tx = (await db()).transaction(STORES, "readwrite");
      const items = tx.objectStore("items");
      const relations = tx.objectStore("relations");
      const outbox = tx.objectStore("outbox");
      for (const item of change.items) items.put(item);
      for (const relation of change.relations) relations.put(relation);
      for (const id of change.removedRelationIds) relations.delete(id);
      for (const event of change.events) outbox.put(event);
      await done(tx);
    },

    async removeFromOutbox(eventIds) {
      const tx = (await db()).transaction("outbox", "readwrite");
      const outbox = tx.objectStore("outbox");
      for (const id of eventIds) outbox.delete(id);
      await done(tx);
    },
  };
}

function open(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" }).createIndex("workspaceId", "workspaceId");
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
