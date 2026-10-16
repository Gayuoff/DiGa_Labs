import type { Event, EventType, Item, Origin, Query, Relation } from "../domain";
import { type Attrs, type EventMeta, invertEvent, mergeData, patchItem } from "./apply";
import { newId } from "./ids";
import { jsonEqual } from "./json";
import type { Change, Persistence } from "./persistence";
import { runQuery } from "./query";

export type Listener = () => void;

/**
 * Subscription topics. Views listen to a type and cards to an item, so a change re-renders only
 * what it affects.
 */
export const topics = {
  type: (key: string) => `type:${key}`,
  item: (id: string) => `item:${id}`,
  relations: (itemId: string) => `relations:${itemId}`,
  history: "history",
} as const;

export class StoreError extends Error {}

export interface StoreOptions {
  workspaceId: string;
  actorId: string;
  persistence?: Persistence;
  now?: () => Date;
  onError?: (error: unknown) => void;
  /** Undo steps kept in memory. */
  historyLimit?: number;
}

export interface ItemDraft {
  type: string;
  title?: string;
  data?: Attrs;
  sample?: boolean;
}

/** Fields to change. In `data`, `null` removes a key; keys not mentioned are left alone. */
export interface ItemPatch {
  title?: string;
  data?: Attrs;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

interface Batch {
  id: string;
  origin: Origin;
  events: Event[];
}

interface Pending {
  batch: Batch;
  priorItems: Map<string, Item | undefined>;
  priorRelations: Map<string, Relation | undefined>;
}

const NO_RELATIONS: readonly Relation[] = Object.freeze([]);

/**
 * The local-first workspace store. Every change is applied in memory at once (optimistic), recorded
 * as events, persisted in the background, and queued in the outbox for server sync.
 *
 * One user action is one batch: one undo step, one persistence write, one round of notifications.
 * Items are immutable; a change replaces the object, so React can compare by reference.
 */
export class WorkspaceStore {
  readonly workspaceId: string;
  readonly actorId: string;

  private readonly persistence: Persistence | undefined;
  private readonly now: () => Date;
  private readonly onError: (error: unknown) => void;
  private readonly historyLimit: number;

  private readonly items = new Map<string, Item>();
  private readonly relations = new Map<string, Relation>();
  private readonly idsByType = new Map<string, Set<string>>();
  private readonly relationIdsByItem = new Map<string, Set<string>>();
  private readonly typeVersions = new Map<string, number>();
  private readonly queryCache = new Map<string, { version: number; result: Item[] }>();
  private readonly relationsCache = new Map<string, readonly Relation[]>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly touched = new Set<string>();

  private undoStack: Batch[] = [];
  private redoStack: Batch[] = [];
  private historyState: HistoryState = { canUndo: false, canRedo: false };
  private outbox: Event[] = [];
  private pending: Pending | null = null;
  private writes: Promise<void> = Promise.resolve();

  constructor(options: StoreOptions) {
    this.workspaceId = options.workspaceId;
    this.actorId = options.actorId;
    this.persistence = options.persistence;
    this.now = options.now ?? (() => new Date());
    this.onError = options.onError ?? ((error) => console.error("[store]", error));
    this.historyLimit = options.historyLimit ?? 200;
  }

  /** A store loaded from its persistence, ready to render. */
  static async open(options: StoreOptions): Promise<WorkspaceStore> {
    const store = new WorkspaceStore(options);
    await store.load();
    return store;
  }

  async load(): Promise<void> {
    if (!this.persistence) return;
    const snapshot = await this.persistence.load(this.workspaceId);
    for (const item of snapshot.items) this.putItem(item);
    for (const relation of snapshot.relations) this.putRelation(relation);
    this.outbox = snapshot.outbox;
    this.notify();
  }

  // --- Reads -----------------------------------------------------------------------------------

  item(id: string): Item | undefined {
    return this.items.get(id);
  }

  /** True only for a brand-new workspace: deleted items still count, so it never re-seeds. */
  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /** Live (not deleted) items of a type, in no particular order. */
  itemsOfType(type: string): Item[] {
    const result: Item[] = [];
    for (const id of this.idsByType.get(type) ?? []) {
      const item = this.items.get(id);
      if (item && item.deletedAt === null) result.push(item);
    }
    return result;
  }

  /** Query results are cached per type version: unchanged data returns the same array. */
  query(query: Query): Item[] {
    const key = JSON.stringify(query);
    const version = this.typeVersions.get(query.type) ?? 0;
    const hit = this.queryCache.get(key);
    if (hit && hit.version === version) return hit.result;
    const result = runQuery(this.itemsOfType(query.type), query);
    this.queryCache.set(key, { version, result });
    return result;
  }

  relationsOf(itemId: string): readonly Relation[] {
    const cached = this.relationsCache.get(itemId);
    if (cached) return cached;
    const result: Relation[] = [];
    for (const id of this.relationIdsByItem.get(itemId) ?? []) {
      const relation = this.relations.get(id);
      if (relation) result.push(relation);
    }
    const value = result.length > 0 ? result : NO_RELATIONS;
    this.relationsCache.set(itemId, value);
    return value;
  }

  get history(): HistoryState {
    return this.historyState;
  }

  /** Events waiting for server sync, oldest first. */
  pendingSync(): readonly Event[] {
    return this.outbox;
  }

  subscribe(topic: string, listener: Listener): () => void {
    let set = this.listeners.get(topic);
    if (!set) this.listeners.set(topic, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(topic);
    };
  }

  // --- Commands --------------------------------------------------------------------------------

  create(draft: ItemDraft): Item {
    return this.transact(() => {
      const at = this.timestamp();
      const item: Item = {
        id: newId(),
        workspaceId: this.workspaceId,
        type: draft.type,
        title: draft.title ?? "",
        data: mergeData({}, draft.data ?? {}),
        createdBy: this.actorId,
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
        version: 1,
        sample: draft.sample ?? false,
      };
      this.record("item.created", item.id, null, item);
      return item;
    });
  }

  /** Records only what actually changed; a patch that changes nothing adds no event or undo step. */
  update(id: string, patch: ItemPatch): Item {
    return this.transact(() => {
      const current = this.requireLive(id);
      const before: Attrs = {};
      const after: Attrs = {};
      if (patch.title !== undefined && patch.title !== current.title) {
        before.title = current.title;
        after.title = patch.title;
      }
      if (patch.data) {
        const was: Attrs = {};
        const now: Attrs = {};
        for (const [key, value] of Object.entries(patch.data)) {
          const old = current.data[key] ?? null;
          const next = value ?? null;
          if (!jsonEqual(old, next)) {
            was[key] = old;
            now[key] = next;
          }
        }
        if (Object.keys(now).length > 0) {
          before.data = was;
          after.data = now;
        }
      }
      if (Object.keys(after).length > 0) this.record("item.updated", id, before, after);
      return this.requireItem(id);
    });
  }

  /** Soft delete: the item leaves every view but can be restored or undone. */
  remove(id: string): void {
    this.transact(() => {
      if (this.requireItem(id).deletedAt !== null) return;
      this.record("item.deleted", id, { deletedAt: null }, { deletedAt: this.timestamp() });
    });
  }

  restore(id: string): void {
    this.transact(() => {
      const current = this.requireItem(id);
      if (current.deletedAt === null) return;
      this.record("item.restored", id, { deletedAt: current.deletedAt }, { deletedAt: null });
    });
  }

  link(kind: string, fromId: string, toId: string): Relation {
    return this.transact(() => {
      if (fromId === toId) throw new StoreError("an item cannot be related to itself");
      this.requireLive(fromId);
      this.requireLive(toId);
      const relation: Relation = {
        id: newId(),
        workspaceId: this.workspaceId,
        kind,
        fromId,
        toId,
        createdBy: this.actorId,
        createdAt: this.timestamp(),
      };
      this.record("relation.created", relation.id, null, relation);
      return relation;
    });
  }

  unlink(relationId: string): void {
    this.transact(() => {
      const relation = this.relations.get(relationId);
      if (relation) this.record("relation.deleted", relationId, relation, null);
    });
  }

  /**
   * Run several commands as one batch: one undo step, one write, one notification. Nested calls
   * join the outer batch. If `fn` throws, every change it made is rolled back.
   * System batches (starter data, server sync) are not undoable: people undo only what they or
   * their AI did.
   */
  transact<T>(fn: () => T, origin: Origin = "user"): T {
    if (this.pending) return fn();
    let result!: T;
    const batch = this.run(origin, () => {
      result = fn();
    });
    if (batch.events.length > 0 && origin !== "system") {
      this.undoStack.push(batch);
      if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
      this.redoStack = [];
    }
    this.commit(batch);
    return result;
  }

  undo(): boolean {
    return this.replayInverse(this.undoStack, this.redoStack);
  }

  redo(): boolean {
    return this.replayInverse(this.redoStack, this.undoStack);
  }

  /** Called by sync once the server has stored these events. */
  async markSynced(eventIds: string[]): Promise<void> {
    const synced = new Set(eventIds);
    this.outbox = this.outbox.filter((event) => !synced.has(event.id));
    const persistence = this.persistence;
    if (persistence) {
      this.writes = this.writes
        .then(() => persistence.removeFromOutbox(eventIds))
        .catch(this.onError);
    }
    await this.writes;
  }

  /** Resolves once every change so far is on disk. */
  flushed(): Promise<void> {
    return this.writes;
  }

  // --- Internals -------------------------------------------------------------------------------

  private run(origin: Origin, fn: (batch: Batch) => void): Batch {
    const batch: Batch = { id: newId(), origin, events: [] };
    this.pending = { batch, priorItems: new Map(), priorRelations: new Map() };
    try {
      fn(batch);
      return batch;
    } catch (error) {
      this.rollback();
      throw error;
    } finally {
      this.pending = null;
    }
  }

  private replayInverse(from: Batch[], to: Batch[]): boolean {
    if (this.pending) throw new StoreError("cannot undo or redo inside a transaction");
    const batch = from.pop();
    if (!batch) return false;
    let inverse: Batch;
    try {
      inverse = this.run("user", (b) => {
        for (const event of [...batch.events].reverse()) {
          const inverted = invertEvent(event, this.meta(b));
          this.apply(inverted);
          b.events.push(inverted);
        }
      });
    } catch (error) {
      from.push(batch);
      throw error;
    }
    to.push(inverse);
    this.commit(inverse);
    return true;
  }

  private commit(batch: Batch): void {
    if (batch.events.length > 0) {
      this.outbox.push(...batch.events);
      this.persist(batch);
    }
    const canUndo = this.undoStack.length > 0;
    const canRedo = this.redoStack.length > 0;
    if (canUndo !== this.historyState.canUndo || canRedo !== this.historyState.canRedo) {
      this.historyState = { canUndo, canRedo };
      this.touched.add(topics.history);
    }
    this.notify();
  }

  private record(type: EventType, targetId: string, before: Attrs | null, after: Attrs | null) {
    const pending = this.requirePending();
    const event: Event = {
      ...this.meta(pending.batch),
      workspaceId: this.workspaceId,
      type,
      targetId,
      before,
      after,
    };
    this.apply(event);
    pending.batch.events.push(event);
  }

  private apply(event: Event): void {
    switch (event.type) {
      case "item.created": {
        const item = event.after as unknown as Item;
        this.rememberItem(item.id);
        this.putItem(item);
        break;
      }
      case "item.updated":
      case "item.deleted":
      case "item.restored": {
        const current = this.requireItem(event.targetId);
        this.rememberItem(current.id);
        this.putItem(patchItem(current, event.after ?? {}, event.at));
        break;
      }
      case "relation.created": {
        const relation = event.after as unknown as Relation;
        this.rememberRelation(relation.id);
        this.putRelation(relation);
        break;
      }
      case "relation.deleted":
        this.rememberRelation(event.targetId);
        this.dropRelation(event.targetId);
        break;
      case "spec.changed":
        break;
    }
  }

  private persist(batch: Batch): void {
    const persistence = this.persistence;
    if (!persistence) return;
    const change: Change = { items: [], relations: [], removedRelationIds: [], events: batch.events };
    const seen = new Set<string>();
    for (const event of batch.events) {
      if (seen.has(event.targetId)) continue;
      seen.add(event.targetId);
      if (event.type.startsWith("item.")) {
        const item = this.items.get(event.targetId);
        if (item) change.items.push(item);
      } else if (event.type.startsWith("relation.")) {
        const relation = this.relations.get(event.targetId);
        if (relation) change.relations.push(relation);
        else change.removedRelationIds.push(event.targetId);
      }
    }
    this.writes = this.writes.then(() => persistence.write(change)).catch(this.onError);
  }

  private rollback(): void {
    const pending = this.requirePending();
    for (const [id, prior] of pending.priorItems) {
      if (prior) this.putItem(prior);
      else this.dropItem(id);
    }
    for (const [id, prior] of pending.priorRelations) {
      if (prior) this.putRelation(prior);
      else this.dropRelation(id);
    }
    // Listeners never saw the rolled-back state, so there is nothing to tell them.
    this.touched.clear();
  }

  private notify(): void {
    const due = [...this.touched];
    this.touched.clear();
    for (const topic of due) {
      for (const listener of this.listeners.get(topic) ?? []) {
        try {
          listener();
        } catch (error) {
          this.onError(error);
        }
      }
    }
  }

  private putItem(item: Item): void {
    this.items.set(item.id, item);
    let ids = this.idsByType.get(item.type);
    if (!ids) this.idsByType.set(item.type, (ids = new Set()));
    ids.add(item.id);
    this.touchType(item.type);
    this.touched.add(topics.item(item.id));
  }

  private dropItem(id: string): void {
    const item = this.items.get(id);
    if (!item) return;
    this.items.delete(id);
    this.idsByType.get(item.type)?.delete(id);
    this.touchType(item.type);
    this.touched.add(topics.item(id));
  }

  private putRelation(relation: Relation): void {
    this.relations.set(relation.id, relation);
    for (const end of [relation.fromId, relation.toId]) {
      let ids = this.relationIdsByItem.get(end);
      if (!ids) this.relationIdsByItem.set(end, (ids = new Set()));
      ids.add(relation.id);
      this.touchRelations(end);
    }
  }

  private dropRelation(id: string): void {
    const relation = this.relations.get(id);
    if (!relation) return;
    this.relations.delete(id);
    for (const end of [relation.fromId, relation.toId]) {
      this.relationIdsByItem.get(end)?.delete(id);
      this.touchRelations(end);
    }
  }

  private touchType(type: string): void {
    this.typeVersions.set(type, (this.typeVersions.get(type) ?? 0) + 1);
    this.touched.add(topics.type(type));
  }

  private touchRelations(itemId: string): void {
    this.relationsCache.delete(itemId);
    this.touched.add(topics.relations(itemId));
  }

  private rememberItem(id: string): void {
    const pending = this.pending;
    if (pending && !pending.priorItems.has(id)) pending.priorItems.set(id, this.items.get(id));
  }

  private rememberRelation(id: string): void {
    const pending = this.pending;
    if (pending && !pending.priorRelations.has(id)) {
      pending.priorRelations.set(id, this.relations.get(id));
    }
  }

  private meta(batch: Batch): EventMeta {
    return {
      id: newId(),
      at: this.timestamp(),
      batchId: batch.id,
      actorId: this.actorId,
      origin: batch.origin,
    };
  }

  private requirePending(): Pending {
    if (!this.pending) throw new StoreError("commands must run inside a transaction");
    return this.pending;
  }

  private requireItem(id: string): Item {
    const item = this.items.get(id);
    if (!item) throw new StoreError(`unknown item '${id}'`);
    return item;
  }

  private requireLive(id: string): Item {
    const item = this.requireItem(id);
    if (item.deletedAt !== null) throw new StoreError(`item '${id}' is deleted`);
    return item;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
