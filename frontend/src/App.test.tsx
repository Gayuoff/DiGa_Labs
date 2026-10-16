// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { App } from "./App";
import { WorkspaceStore } from "./store";
import { seedStudyHq, STUDY_HQ } from "./workspace/examples";

beforeAll(() => {
  // jsdom lacks two browser APIs the shell uses: scrollIntoView and matchMedia.
  Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(window, "matchMedia", {
    value: (media: string) => ({
      matches: false,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

afterEach(cleanup);

function renderApp() {
  const store = new WorkspaceStore({ workspaceId: "test", actorId: "tester" });
  store.initSpec(STUDY_HQ);
  seedStudyHq(store, new Date("2026-10-16T09:00:00Z"));
  render(<App store={store} />);
  return store;
}

describe("workspace shell", () => {
  it("renders the spec's pages and views with live data", async () => {
    renderApp();
    expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeTruthy();
    for (const title of ["Assignments", "Deadline calendar", "Inbox"]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeTruthy();
    }
    // Renderers load lazily, so wait for their content.
    expect((await screen.findAllByText("DBMS assignment 3")).length).toBeGreaterThan(0);
    expect(await screen.findByDisplayValue("Revise ER diagrams before Friday")).toBeTruthy();
    expect(await screen.findByLabelText("In progress, 2 items")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
  });

  it("runs commands from the palette and undoes them with the keyboard", async () => {
    const store = renderApp();
    await screen.findByRole("heading", { level: 1, name: "Home" });
    expect(store.history.canUndo).toBe(false);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "new note" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(store.itemsOfType("note")).toHaveLength(4);
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => {
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    });
    expect(store.itemsOfType("note")).toHaveLength(3);
  });
});
