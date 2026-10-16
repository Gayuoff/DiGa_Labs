// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { App } from "@/App";
import { WorkspaceStore } from "@/store";
import { seedStudyHq, STUDY_HQ } from "./examples";

beforeAll(() => {
  // jsdom lacks these browser APIs. Screens count as wide, so layout editing is available.
  Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(window, "matchMedia", {
    value: (media: string) => ({
      matches: media.includes("min-width"),
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

async function renderApp() {
  const store = new WorkspaceStore({ workspaceId: "test", actorId: "tester" });
  store.initSpec(STUDY_HQ);
  seedStudyHq(store);
  render(<App store={store} />);
  await screen.findByRole("heading", { level: 2, name: "Inbox" });
  return store;
}

const viewTitle = (store: WorkspaceStore, key: string) =>
  store.spec?.views.find((v) => v.key === key)?.title;

/** Clicks Undo on the notification with this message (others may still be showing). */
function undoFromNotice(message: string) {
  const notices = screen.getByRole("status", { name: "Notifications" });
  const notice = within(notices).getByText(message).parentElement!;
  fireEvent.click(within(notice).getByRole("button", { name: "Undo" }));
}

function openMenu(viewName: string) {
  fireEvent.click(screen.getByRole("button", { name: `${viewName} options` }));
  return screen.getByRole("menu", { name: `${viewName} options` });
}

describe("editing views", () => {
  it("renames a view from its menu, as one undoable change", async () => {
    const store = await renderApp();
    fireEvent.click(within(openMenu("Inbox")).getByRole("menuitem", { name: "Rename" }));
    const input = screen.getByRole("textbox", { name: "View name" });
    fireEvent.change(input, { target: { value: "Capture" } });
    fireEvent.blur(input);
    expect(viewTitle(store, "inbox")).toBe("Capture");
    expect(screen.getByRole("heading", { level: 2, name: "Capture" })).toBeTruthy();

    act(() => {
      store.undo();
    });
    expect(screen.getByRole("heading", { level: 2, name: "Inbox" })).toBeTruthy();
  });

  it("switches display, and explains displays that cannot work", async () => {
    const store = await renderApp();
    const menu = openMenu("Inbox");
    const board = within(menu).getByRole("menuitemradio", { name: /Board/ }) as HTMLButtonElement;
    expect(board.disabled).toBe(true);
    expect(board.textContent).toMatch(/no choice field/);

    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /Table/ }));
    expect(store.spec?.views.find((v) => v.key === "inbox")?.display).toBe("table");
    expect(await screen.findByRole("table", { name: "Inbox" })).toBeTruthy();
  });

  it("removes a view and brings it back from the undo notice", async () => {
    const store = await renderApp();
    fireEvent.click(within(openMenu("Inbox")).getByRole("menuitem", { name: "Remove from page" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Inbox" })).toBeNull();
    expect(store.spec?.views.some((v) => v.key === "inbox")).toBe(false);

    undoFromNotice("Removed “Inbox”");
    expect(await screen.findByRole("heading", { level: 2, name: "Inbox" })).toBeTruthy();
  });
});

describe("editing pages", () => {
  it("creates a page, names it, and fills it with a new view", async () => {
    const store = await renderApp();
    fireEvent.click(screen.getByRole("button", { name: "New page" }));
    expect(await screen.findByText("This page is empty")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Page name: Untitled page/ }));
    const name = screen.getByRole("textbox", { name: "Page name" });
    fireEvent.change(name, { target: { value: "Reading" } });
    fireEvent.blur(name);
    expect(screen.getByRole("link", { name: "Reading" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add view" }));
    const form = screen.getByRole("dialog", { name: "Add view" });
    fireEvent.change(within(form).getByRole("textbox"), { target: { value: "Book notes" } });
    fireEvent.change(within(form).getByRole("combobox"), { target: { value: "note" } });
    fireEvent.click(within(form).getByRole("radio", { name: /Document/ }));
    fireEvent.click(within(form).getByRole("button", { name: "Add view" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Book notes" })).toBeTruthy();
    const page = store.spec?.pages.find((p) => p.title === "Reading");
    const view = store.spec?.views.find((v) => v.title === "Book notes");
    expect(view?.display).toBe("doc");
    expect(page?.blocks.map((b) => b.view)).toEqual([view?.key]);
  });

  it("enters layout editing, and deletes a page with an undo offer", async () => {
    const store = await renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Edit layout/ }));
    expect(screen.getByRole("button", { name: /Done/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Add view" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete page" }));
    expect(store.spec?.pages.some((p) => p.key === "home")).toBe(false);
    undoFromNotice("Deleted page “Home”");
    expect(store.spec?.pages.some((p) => p.key === "home")).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: /Edit layout/ })).toBeTruthy();
  });
});
