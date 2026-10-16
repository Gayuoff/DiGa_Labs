import { describe, expect, it, vi } from "vitest";
import { renameView } from "../spec/ops";
import { STUDY_HQ } from "../workspace/examples";
import { makeQuery } from "./query";
import { StoreError, topics, WorkspaceStore } from "./store";

function makeStore(historyLimit?: number) {
  return new WorkspaceStore({ workspaceId: "ws1", actorId: "u1", historyLimit });
}

const tasks = makeQuery("task", { sort: [{ field: "title", dir: "asc" }] });
const titles = (store: WorkspaceStore) => store.query(tasks).map((i) => i.title);

describe("commands", () => {
  it("creates items that queries see at once", () => {
    const store = makeStore();
    const item = store.create({ type: "task", title: "Write report", data: { status: "todo" } });
    expect(store.item(item.id)).toEqual(item);
    expect(titles(store)).toEqual(["Write report"]);
    const [event] = store.pendingSync();
    expect(event?.type).toBe("item.created");
    expect(event?.after).toEqual(item);
  });

  it("records only the fields that changed", () => {
    const store = makeStore();
    const item = store.create({ type: "task", title: "A", data: { status: "todo", due: "2026-10-20" } });
    store.update(item.id, { title: "A", data: { status: "done", due: "2026-10-20" } });
    const event = store.pendingSync().at(-1);
    expect(event?.type).toBe("item.updated");
    expect(event?.before).toEqual({ data: { status: "todo" } });
    expect(event?.after).toEqual({ data: { status: "done" } });
    expect(store.item(item.id)?.version).toBe(2);
  });

  it("treats a patch that changes nothing as a no-op that keeps redo intact", () => {
    const store = makeStore();
    const item = store.create({ type: "task", title: "A" });
    store.update(item.id, { title: "B" });
    store.undo();
    const events = store.pendingSync().length;
    store.update(item.id, { title: "A", data: { missing: null } });
    expect(store.pendingSync().length).toBe(events);
    expect(store.history.canRedo).toBe(true);
  });

  it("removes a data key when it is set to null", () => {
    const store = makeStore();
    const item = store.create({ type: "task", data: { due: "2026-10-20", status: "todo" } });
    store.update(item.id, { data: { due: null } });
    expect(store.item(item.id)?.data).toEqual({ status: "todo" });
  });

  it("soft-deletes and restores", () => {
    const store = makeStore();
    const item = store.create({ type: "task", title: "A" });
    store.remove(item.id);
    expect(titles(store)).toEqual([]);
    expect(store.item(item.id)?.deletedAt).not.toBeNull();
    store.restore(item.id);
    expect(titles(store)).toEqual(["A"]);
  });

  it("refuses to edit a deleted item", () => {
    const store = makeStore();
    const item = store.create({ type: "task" });
    store.remove(item.id);
    expect(() => store.update(item.id, { title: "x" })).toThrow(StoreError);
  });

  it("links and unlinks items", () => {
    const store = makeStore();
    const a = store.create({ type: "task" });
    const b = store.create({ type: "subject" });
    const relation = store.link("subject", a.id, b.id);
    expect(store.relationsOf(a.id)).toEqual([relation]);
    expect(store.relationsOf(b.id)).toEqual([relation]);
    store.unlink(relation.id);
    expect(store.relationsOf(a.id)).toEqual([]);
    expect(() => store.link("self", a.id, a.id)).toThrow("related to itself");
  });
});

describe("undo and redo", () => {
  it("undoes and redoes a create", () => {
    const store = makeStore();
    store.create({ type: "task", title: "A" });
    expect(store.undo()).toBe(true);
    expect(titles(store)).toEqual([]);
    expect(store.redo()).toBe(true);
    expect(titles(store)).toEqual(["A"]);
  });

  it("restores the exact previous title and data, including keys that did not exist", () => {
    const store = makeStore();
    const item = store.create({ type: "task", title: "Old", data: { status: "todo" } });
    store.update(item.id, { title: "New", data: { status: "done", due: "2026-10-20" } });
    store.undo();
    expect(store.item(item.id)?.title).toBe("Old");
    expect(store.item(item.id)?.data).toEqual({ status: "todo" });
    store.redo();
    expect(store.item(item.id)?.data).toEqual({ status: "done", due: "2026-10-20" });
  });

  it("undoes a relation removal", () => {
    const store = makeStore();
    const a = store.create({ type: "task" });
    const b = store.create({ type: "task" });
    const relation = store.link("blocks", a.id, b.id);
    store.unlink(relation.id);
    store.undo();
    expect(store.relationsOf(a.id)).toEqual([relation]);
  });

  it("never rewrites history: undo appends inverse events", () => {
    const store = makeStore();
    store.create({ type: "task", title: "A" });
    store.undo();
    store.redo();
    expect(store.pendingSync().map((e) => e.type)).toEqual([
      "item.created",
      "item.deleted",
      "item.restored",
    ]);
  });

  it("clears redo when a new change is made", () => {
    const store = makeStore();
    store.create({ type: "task", title: "A" });
    store.undo();
    store.create({ type: "task", title: "B" });
    expect(store.history).toEqual({ canUndo: true, canRedo: false });
    expect(store.redo()).toBe(false);
  });

  it("keeps at most historyLimit undo steps", () => {
    const store = makeStore(2);
    for (const title of ["A", "B", "C"]) store.create({ type: "task", title });
    expect(store.undo() && store.undo()).toBe(true);
    expect(store.undo()).toBe(false);
    expect(titles(store)).toEqual(["A"]);
  });
});

describe("transactions", () => {
  it("groups commands into one undo step and tags the origin", () => {
    const store = makeStore();
    store.transact(() => {
      store.create({ type: "task", title: "A" });
      store.create({ type: "task", title: "B" });
    }, "ai");
    const events = store.pendingSync();
    expect(new Set(events.map((e) => e.batchId)).size).toBe(1);
    expect(events.every((e) => e.origin === "ai")).toBe(true);
    store.undo();
    expect(titles(store)).toEqual([]);
  });

  it("does not offer system batches for undo", () => {
    const store = makeStore();
    store.transact(() => store.create({ type: "task", title: "Seed" }), "system");
    expect(store.history.canUndo).toBe(false);
    store.create({ type: "task", title: "Mine" });
    store.undo();
    expect(store.undo()).toBe(false);
    expect(titles(store)).toEqual(["Seed"]);
  });

  it("rolls back everything when a command fails", () => {
    const store = makeStore();
    const kept = store.create({ type: "task", title: "Kept" });
    const listener = vi.fn();
    store.subscribe(topics.type("task"), listener);
    expect(() =>
      store.transact(() => {
        store.update(kept.id, { title: "Changed" });
        store.create({ type: "task", title: "New" });
        store.update("missing", { title: "boom" });
      }),
    ).toThrow(StoreError);
    expect(titles(store)).toEqual(["Kept"]);
    expect(store.item(kept.id)).toEqual(kept);
    expect(store.pendingSync()).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
    store.undo();
    expect(titles(store)).toEqual([]);
  });
});

describe("spec", () => {
  function withSpec() {
    const store = makeStore();
    store.initSpec(STUDY_HQ);
    return store;
  }

  it("sets the first spec without offering it for undo", () => {
    const store = withSpec();
    expect(store.spec?.name).toBe("Study HQ");
    expect(store.history.canUndo).toBe(false);
    store.initSpec({ ...STUDY_HQ, name: "Other" });
    expect(store.spec?.name).toBe("Study HQ");
  });

  it("undoes and redoes structure changes and notifies spec listeners", () => {
    const store = withSpec();
    const listener = vi.fn();
    store.subscribe(topics.spec, listener);
    store.changeSpec(renameView(STUDY_HQ, "inbox", "Capture"));
    expect(store.spec?.views.find((v) => v.key === "inbox")?.title).toBe("Capture");
    store.undo();
    expect(store.spec).toEqual(STUDY_HQ);
    store.redo();
    expect(store.spec?.views.find((v) => v.key === "inbox")?.title).toBe("Capture");
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("rejects an invalid spec and keeps the current one", () => {
    const store = withSpec();
    const broken = structuredClone(STUDY_HQ);
    broken.views[0]!.groupBy = "due";
    expect(() => store.changeSpec(broken)).toThrow("must be a select field");
    expect(store.spec).toEqual(STUDY_HQ);
    expect(store.pendingSync()).toHaveLength(1);
  });

  it("records nothing for an unchanged spec", () => {
    const store = withSpec();
    store.changeSpec(structuredClone(STUDY_HQ));
    expect(store.pendingSync()).toHaveLength(1);
    expect(store.history.canUndo).toBe(false);
  });

  it("checks item data against field types once a spec is set", () => {
    const store = withSpec();
    expect(() => store.create({ type: "assignment", data: { status: "blocked" } })).toThrow(
      "'blocked' is not an option",
    );
    expect(() => store.create({ type: "exam" })).toThrow("unknown type 'exam'");
    const item = store.create({ type: "assignment", data: { status: "todo" } });
    expect(() => store.update(item.id, { data: { due: "next week" } })).toThrow("expected a date");
    expect(store.item(item.id)?.data).toEqual({ status: "todo" });
  });

  it("rolls back a spec change made in a failing transaction", () => {
    const store = withSpec();
    expect(() =>
      store.transact(() => {
        store.changeSpec(renameView(STUDY_HQ, "inbox", "Capture"));
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(store.spec).toEqual(STUDY_HQ);
  });
});

describe("notifications", () => {
  it("notifies only the topics a change touches, once per batch", () => {
    const store = makeStore();
    const taskListener = vi.fn();
    const noteListener = vi.fn();
    store.subscribe(topics.type("task"), taskListener);
    store.subscribe(topics.type("note"), noteListener);
    store.transact(() => {
      store.create({ type: "task" });
      store.create({ type: "task" });
    });
    expect(taskListener).toHaveBeenCalledTimes(1);
    expect(noteListener).not.toHaveBeenCalled();
  });

  it("returns the same query result while the queried type is unchanged", () => {
    const store = makeStore();
    store.create({ type: "task", title: "A" });
    const first = store.query(tasks);
    store.create({ type: "note", title: "unrelated" });
    expect(store.query(tasks)).toBe(first);
    store.create({ type: "task", title: "B" });
    expect(store.query(tasks)).not.toBe(first);
  });

  it("keeps one bad listener from breaking the others", () => {
    const onError = vi.fn();
    const store = new WorkspaceStore({ workspaceId: "ws1", actorId: "u1", onError });
    const good = vi.fn();
    store.subscribe(topics.type("task"), () => {
      throw new Error("bad listener");
    });
    store.subscribe(topics.type("task"), good);
    store.create({ type: "task" });
    expect(good).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});
