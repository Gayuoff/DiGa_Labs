// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { format } from "date-fns";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StoreProvider, useQuery, WorkspaceStore } from "@/store";
import { seedStudyHq, STUDY_HQ } from "@/workspace/examples";
import { SpecProvider } from "@/workspace/spec";
import BoardView from "./board/BoardView";
import CalendarView from "./calendar/CalendarView";
import DocView from "./doc/DocView";
import ListView from "./list/ListView";
import TableView from "./table/TableView";
import type { RendererProps } from "./types";

afterEach(cleanup);

// Seed mid-month so every sample deadline (-1 to +12 days) falls in the current month.
const now = new Date();
const seedDay = new Date(now.getFullYear(), now.getMonth(), 10);

function renderView(viewKey: string, Renderer: ComponentType<RendererProps>) {
  const store = new WorkspaceStore({ workspaceId: "test", actorId: "tester" });
  seedStudyHq(store, seedDay);
  const view = STUDY_HQ.views.find((v) => v.key === viewKey)!;
  const type = STUDY_HQ.types.find((t) => t.key === view.query.type)!;
  function Harness() {
    const items = useQuery(view.query);
    return <Renderer view={view} type={type} items={items} />;
  }
  render(
    <StoreProvider value={store}>
      <SpecProvider value={STUDY_HQ}>
        <Harness />
      </SpecProvider>
    </StoreProvider>,
  );
  return store;
}

const byTitle = (store: WorkspaceStore, type: string, title: string) =>
  store.itemsOfType(type).find((i) => i.title === title);

describe("board", () => {
  it("shows one column per status with live counts", () => {
    renderView("assignments_board", BoardView);
    expect(screen.getByLabelText("To start, 3 items")).toBeTruthy();
    expect(screen.getByLabelText("In progress, 2 items")).toBeTruthy();
    expect(screen.getByLabelText("Submitted, 1 items")).toBeTruthy();
  });

  it("adds a card to the column it was created in", () => {
    const store = renderView("assignments_board", BoardView);
    const column = screen.getByLabelText("Submitted, 1 items");
    fireEvent.click(within(column).getByRole("button", { name: /Add assignment/ }));
    const input = within(column).getByRole("textbox") as HTMLInputElement;
    input.value = "Lab viva";
    fireEvent.keyDown(input, { key: "Enter" });
    expect(byTitle(store, "assignment", "Lab viva")?.data.status).toBe("done");
    expect(screen.getByLabelText("Submitted, 2 items")).toBeTruthy();
  });

  it("edits a card title in place", () => {
    const store = renderView("assignments_board", BoardView);
    fireEvent.click(screen.getByRole("button", { name: /DBMS assignment 3\. Edit/ }));
    const input = screen.getByRole("textbox", { name: "Assignment title" });
    fireEvent.change(input, { target: { value: "DBMS assignment 3 (final)" } });
    fireEvent.blur(input);
    expect(byTitle(store, "assignment", "DBMS assignment 3 (final)")).toBeTruthy();
  });
});

describe("list", () => {
  it("adds items that match the view's filter, and deletes them", () => {
    const store = renderView("inbox", ListView);
    expect(screen.getByDisplayValue("Revise ER diagrams before Friday")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Add note/ }));
    const input = screen.getByRole("textbox", { name: "Add note" }) as HTMLInputElement;
    input.value = "Call the placement cell";
    fireEvent.keyDown(input, { key: "Enter" });
    const note = byTitle(store, "note", "Call the placement cell");
    expect(note?.data.tags).toEqual(["inbox"]);
    expect(screen.getByDisplayValue("Call the placement cell")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete Call the placement cell" }));
    expect(screen.queryByDisplayValue("Call the placement cell")).toBeNull();
    act(() => {
      store.undo();
    });
    expect(screen.getByDisplayValue("Call the placement cell")).toBeTruthy();
  });

  it("saves a renamed title on blur as one change", () => {
    const store = renderView("inbox", ListView);
    const input = screen.getByDisplayValue("Ask about lab viva dates");
    fireEvent.change(input, { target: { value: "Ask about viva dates" } });
    fireEvent.change(input, { target: { value: "Ask about viva dates on Monday" } });
    const before = store.pendingSync().length;
    fireEvent.blur(input);
    expect(store.pendingSync().length).toBe(before + 1);
    expect(byTitle(store, "note", "Ask about viva dates on Monday")).toBeTruthy();
  });
});

describe("table", () => {
  it("shows a column per field and edits cells by type", () => {
    const store = renderView("assignment_table", TableView);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.slice(0, 5)).toEqual(["Title", "Status", "Due", "Priority", "Subject"]);

    // Rows are sorted by due date: the first is the overdue worksheet.
    const firstRow = screen.getAllByRole("row")[1]!;
    expect(within(firstRow).getByDisplayValue("Normalization worksheet")).toBeTruthy();
    expect(within(firstRow).getByText("DBMS")).toBeTruthy();

    fireEvent.change(within(firstRow).getByLabelText("Due"), { target: { value: "2030-01-15" } });
    expect(byTitle(store, "assignment", "Normalization worksheet")?.data.due).toBe("2030-01-15");

    // The new due date re-sorts the rows; find the worksheet's row again.
    const row = screen
      .getAllByRole("row")
      .find((r) => within(r).queryByDisplayValue("Normalization worksheet"))!;
    expect(screen.getAllByRole("row").at(-1)).toBe(row);
    fireEvent.click(within(row).getByRole("button", { name: "Priority" }));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Priority" })).getByText("High"));
    expect(byTitle(store, "assignment", "Normalization worksheet")?.data.priority).toBe("high");
  });

  it("changes a relation through the picker", () => {
    const store = renderView("assignment_table", TableView);
    const row = screen.getAllByRole("row")[1]!;
    fireEvent.click(within(row).getByRole("button", { name: "Subject" }));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Subject" })).getByText("Computer Networks"));
    const item = byTitle(store, "assignment", "Normalization worksheet")!;
    const links = store.relationsOf(item.id).filter((r) => r.fromId === item.id);
    expect(links.map((r) => store.item(r.toId)?.title)).toEqual(["Computer Networks"]);
  });
});

describe("calendar", () => {
  it("places items on their day, adds on a day, and pages months", () => {
    const store = renderView("deadlines", CalendarView);
    expect(screen.getByText(format(now, "MMMM yyyy"))).toBeTruthy();
    expect(screen.getByText("DBMS assignment 3")).toBeTruthy();

    const day = new Date(now.getFullYear(), now.getMonth(), 25);
    fireEvent.click(screen.getByRole("button", { name: `Add on ${format(day, "MMMM d")}` }));
    const added = store.itemsOfType("assignment").find((i) => i.data.due === format(day, "yyyy-MM-dd"));
    expect(added?.title).toBe("Untitled assignment");

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    expect(screen.getByText(format(next, "MMMM yyyy"))).toBeTruthy();
  });
});

describe("doc", () => {
  it("edits the selected note and keeps unsaved text when switching notes", () => {
    const store = renderView("notes", DocView);
    const body = screen.getByRole("textbox", { name: "Body" });
    const selectedTitle = (screen.getByRole("textbox", { name: "Note title" }) as HTMLInputElement).value;
    const otherTitle = ["Ask about lab viva dates", "Update resume projects section"].find(
      (title) => title !== selectedTitle,
    )!;
    fireEvent.change(body, { target: { value: "Chapters 3 and 4" } });

    // Switch notes before the save pause ends: the editor unmounts and must still save.
    fireEvent.click(screen.getByRole("button", { name: new RegExp(otherTitle) }));
    expect(byTitle(store, "note", selectedTitle)?.data.body).toBe("Chapters 3 and 4");
    expect((screen.getByRole("textbox", { name: "Note title" }) as HTMLInputElement).value).toBe(
      otherTitle,
    );
  });

  it("creates and selects a new note", () => {
    const store = renderView("notes", DocView);
    fireEvent.click(screen.getByRole("button", { name: /New note/ }));
    expect(store.itemsOfType("note")).toHaveLength(4);
    expect((screen.getByRole("textbox", { name: "Note title" }) as HTMLInputElement).value).toBe("");
  });
});
