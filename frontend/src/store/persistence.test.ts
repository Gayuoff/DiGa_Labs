import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { renameView } from "../spec/ops";
import { STUDY_HQ } from "../workspace/examples";
import { indexedDbPersistence } from "./persistence";
import { WorkspaceStore } from "./store";

function open(factory: IDBFactory, workspaceId = "ws1") {
  return WorkspaceStore.open({
    workspaceId,
    actorId: "u1",
    persistence: indexedDbPersistence(factory as unknown as globalThis.IDBFactory),
  });
}

describe("IndexedDB persistence", () => {
  it("restores items, relations and the outbox after a reload", async () => {
    const factory = new IDBFactory();
    const store = await open(factory);
    const a = store.create({ type: "task", title: "A" });
    const b = store.create({ type: "task", title: "B" });
    const kept = store.link("blocks", a.id, b.id);
    const dropped = store.link("related", b.id, a.id);
    store.update(a.id, { data: { status: "done" } });
    store.unlink(dropped.id);
    store.remove(b.id);
    await store.flushed();

    const reopened = await open(factory);
    expect(reopened.item(a.id)).toEqual(store.item(a.id));
    expect(reopened.item(b.id)?.deletedAt).not.toBeNull();
    expect(reopened.relationsOf(a.id)).toEqual([kept]);
    expect(reopened.pendingSync().map((e) => e.id)).toEqual(store.pendingSync().map((e) => e.id));
  });

  it("restores the spec, including structure changes", async () => {
    const factory = new IDBFactory();
    const store = await open(factory);
    store.initSpec(STUDY_HQ);
    store.changeSpec(renameView(STUDY_HQ, "inbox", "Capture"));
    await store.flushed();
    const reopened = await open(factory);
    expect(reopened.spec).toEqual(store.spec);
    expect(reopened.spec?.views.find((v) => v.key === "inbox")?.title).toBe("Capture");
  });

  it("keeps workspaces apart", async () => {
    const factory = new IDBFactory();
    const one = await open(factory, "ws1");
    one.create({ type: "task", title: "Mine" });
    await one.flushed();
    const two = await open(factory, "ws2");
    expect(two.itemsOfType("task")).toEqual([]);
    expect(two.pendingSync()).toEqual([]);
  });

  it("forgets synced events durably", async () => {
    const factory = new IDBFactory();
    const store = await open(factory);
    store.create({ type: "task", title: "A" });
    store.create({ type: "task", title: "B" });
    const [first] = store.pendingSync();
    await store.markSynced([first!.id]);
    expect(store.pendingSync()).toHaveLength(1);
    const reopened = await open(factory);
    expect(reopened.pendingSync()).toHaveLength(1);
    expect(reopened.itemsOfType("task")).toHaveLength(2);
  });
});
