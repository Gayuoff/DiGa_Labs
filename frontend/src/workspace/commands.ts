import type { Spec } from "@/domain";
import type { ColorMode } from "@/design/colorMode";
import { MOD } from "@/design/Kbd";
import type { WorkspaceStore } from "@/store";
import { pagePath } from "./routes";

/**
 * Every action in the workspace is a command: the palette, shortcuts and (later) the AI all run
 * actions through this one list.
 */
export interface Command {
  id: string;
  title: string;
  section: string;
  /** A lucide icon name. */
  icon: string;
  keywords?: string;
  shortcut?: string[];
  run: () => void;
}

export interface CommandContext {
  spec: Spec;
  store: WorkspaceStore;
  navigate: (path: string) => void;
  setMode: (mode: ColorMode) => void;
  editing: boolean;
  onToggleEditing: () => void;
  onNewPage: () => void;
}

const MODES: { mode: ColorMode; label: string; icon: string; keywords: string }[] = [
  { mode: "light", label: "Light", icon: "sun", keywords: "day bright appearance" },
  { mode: "dark", label: "Dark", icon: "moon", keywords: "night appearance" },
  { mode: "system", label: "Match system", icon: "monitor", keywords: "auto appearance" },
];

export function buildCommands({
  spec,
  store,
  navigate,
  setMode,
  editing,
  onToggleEditing,
  onNewPage,
}: CommandContext): Command[] {
  return [
    ...spec.pages.map((page) => ({
      id: `go:${page.key}`,
      title: `Go to ${page.title}`,
      section: "Navigate",
      icon: page.icon ?? "file",
      keywords: "page open",
      run: () => navigate(pagePath(page.key)),
    })),
    ...spec.types.map((type) => ({
      id: `new:${type.key}`,
      title: `New ${type.label.toLowerCase()}`,
      section: "Create",
      icon: type.icon ?? "plus",
      keywords: "add create",
      run: () => {
        store.create({ type: type.key, title: `Untitled ${type.label.toLowerCase()}` });
      },
    })),
    {
      id: "new-page",
      title: "New page",
      section: "Workspace",
      icon: "file-plus",
      keywords: "add create page",
      run: onNewPage,
    },
    {
      id: "edit-layout",
      title: editing ? "Finish editing layout" : "Edit layout",
      section: "Workspace",
      icon: "layout-dashboard",
      keywords: "arrange move resize views customize",
      run: onToggleEditing,
    },
    {
      id: "undo",
      title: "Undo",
      section: "Edit",
      icon: "undo-2",
      shortcut: [MOD, "Z"],
      run: () => {
        store.undo();
      },
    },
    {
      id: "redo",
      title: "Redo",
      section: "Edit",
      icon: "redo-2",
      shortcut: [MOD, "Shift", "Z"],
      run: () => {
        store.redo();
      },
    },
    ...MODES.map(({ mode, label, icon, keywords }) => ({
      id: `mode:${mode}`,
      title: `Theme: ${label}`,
      section: "Appearance",
      icon,
      keywords,
      run: () => setMode(mode),
    })),
  ];
}
