// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { StoreProvider, useHistory, useItem, useQuery } from "./hooks";
import { makeQuery } from "./query";
import { WorkspaceStore } from "./store";

function setup() {
  const store = new WorkspaceStore({ workspaceId: "ws1", actorId: "u1" });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(StoreProvider, { value: store }, children);
  return { store, wrapper };
}

describe("hooks", () => {
  it("useQuery re-renders for its own type only", () => {
    const { store, wrapper } = setup();
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return useQuery(makeQuery("task"));
      },
      { wrapper },
    );
    const initial = renders;

    act(() => {
      store.create({ type: "note", title: "unrelated" });
    });
    expect(renders).toBe(initial);

    act(() => {
      store.create({ type: "task", title: "A" });
    });
    expect(result.current.map((i) => i.title)).toEqual(["A"]);
    expect(renders).toBe(initial + 1);
  });

  it("useItem follows one item, useHistory follows undo state", () => {
    const { store, wrapper } = setup();
    const item = store.create({ type: "task", title: "A" });
    const { result } = renderHook(() => ({ item: useItem(item.id), history: useHistory() }), {
      wrapper,
    });
    expect(result.current.history).toEqual({ canUndo: true, canRedo: false });

    act(() => {
      store.update(item.id, { title: "B" });
    });
    expect(result.current.item?.title).toBe("B");

    act(() => {
      store.undo();
    });
    expect(result.current.item?.title).toBe("A");
    expect(result.current.history.canRedo).toBe(true);
  });
});
