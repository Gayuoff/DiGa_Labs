import { addDays, format } from "date-fns";
import type { Spec } from "@/domain";
import type { WorkspaceStore } from "@/store";
import studyHq from "../../../shared/examples/study_hq.json";

/**
 * The "Study HQ" reference spec, validated by the backend (scripts/export_schema.py).
 * Stands in for the Architect AI until step 2 generates specs from a prompt.
 */
export const STUDY_HQ = studyHq as Spec;

type Assignment = [title: string, status: string, dueInDays: number, priority: string, subject: string];

const SUBJECTS: [title: string, credits: number][] = [
  ["DBMS", 4],
  ["Operating Systems", 4],
  ["Computer Networks", 3],
];

const ASSIGNMENTS: Assignment[] = [
  ["DBMS assignment 3", "doing", 2, "high", "DBMS"],
  ["OS lab record", "todo", 4, "medium", "Operating Systems"],
  ["Packet Tracer task", "todo", 6, "low", "Computer Networks"],
  ["Normalization worksheet", "done", -1, "medium", "DBMS"],
  ["Deadlock case study", "doing", 9, "high", "Operating Systems"],
  ["Subnetting quiz prep", "todo", 12, "medium", "Computer Networks"],
];

const NOTES: [title: string, tags: string[]][] = [
  ["Ask about lab viva dates", ["inbox"]],
  ["Revise ER diagrams before Friday", ["inbox", "exam"]],
  ["Update resume projects section", ["inbox"]],
];

/** Starter items so a new workspace looks lived-in. Marked `sample`, and not undoable. */
export function seedStudyHq(store: WorkspaceStore, today: Date = new Date()): void {
  const day = (offset: number) => format(addDays(today, offset), "yyyy-MM-dd");
  store.transact(() => {
    const subjects = new Map(
      SUBJECTS.map(([title, credits]) => [
        title,
        store.create({ type: "subject", title, data: { credits }, sample: true }),
      ]),
    );
    for (const [title, status, dueInDays, priority, subject] of ASSIGNMENTS) {
      const assignment = store.create({
        type: "assignment",
        title,
        data: { status, due: day(dueInDays), priority },
        sample: true,
      });
      store.link("subject", assignment.id, subjects.get(subject)!.id);
    }
    for (const [title, tags] of NOTES) {
      store.create({ type: "note", title, data: { tags }, sample: true });
    }
  }, "system");
}
