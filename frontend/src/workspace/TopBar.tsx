import { Check, LayoutDashboard, Monitor, Moon, Redo2, Search, Sun, Trash, Undo2 } from "lucide-react";
import type { Page } from "@/domain";
import { Button } from "@/design/Button";
import type { ColorMode } from "@/design/colorMode";
import { Icon } from "@/design/Icon";
import { MOD } from "@/design/Kbd";
import { EditableText } from "@/renderers/shared/EditableText";
import { removePage, renamePage } from "@/spec/ops";
import { useHistory, useStore } from "@/store";
import { useEditSpec } from "./editSpec";
import { useSpec } from "./spec";

const NEXT_MODE: Record<ColorMode, ColorMode> = { system: "light", light: "dark", dark: "system" };
const MODE_ICON = { system: Monitor, light: Sun, dark: Moon } as const;
const MODE_LABEL: Record<ColorMode, string> = {
  system: "Theme: match system",
  light: "Theme: light",
  dark: "Theme: dark",
};

interface TopBarProps {
  page: Page;
  mode: ColorMode;
  onModeChange: (mode: ColorMode) => void;
  onOpenPalette: () => void;
  editing: boolean;
  onToggleEditing: () => void;
}

export function TopBar({
  page,
  mode,
  onModeChange,
  onOpenPalette,
  editing,
  onToggleEditing,
}: TopBarProps) {
  const store = useStore();
  const spec = useSpec();
  const edit = useEditSpec();
  const history = useHistory();
  const ModeIcon = MODE_ICON[mode];

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-canvas px-[var(--pad)]">
      <Icon name={page.icon} size={18} className="mr-1.5 shrink-0 text-accent" />
      <h1 className="min-w-0 flex-1 text-base">
        <EditableText
          value={page.title}
          ariaLabel="Page name"
          onSave={(title) => title && edit((s) => renamePage(s, page.key, title))}
          className="max-w-full truncate rounded-sm px-1 hover:bg-subtle"
        />
      </h1>

      {editing && (
        <Button
          icon
          aria-label="Delete page"
          title={spec.pages.length > 1 ? "Delete page" : "A workspace needs at least one page"}
          disabled={spec.pages.length <= 1}
          className="hidden text-danger md:inline-flex"
          onClick={() => edit((s) => removePage(s, page.key), `Deleted page “${page.title}”`)}
        >
          <Trash size={16} />
        </Button>
      )}
      <Button
        aria-pressed={editing}
        variant={editing ? "primary" : "ghost"}
        className="hidden md:inline-flex"
        onClick={onToggleEditing}
      >
        {editing ? <Check size={15} /> : <LayoutDashboard size={15} />}
        {editing ? "Done" : "Edit layout"}
      </Button>
      <Button icon className="md:hidden" aria-label="Search and commands" onClick={onOpenPalette}>
        <Search size={16} />
      </Button>
      <Button
        icon
        aria-label="Undo"
        title={`Undo (${MOD}+Z)`}
        disabled={!history.canUndo}
        onClick={() => store.undo()}
      >
        <Undo2 size={16} />
      </Button>
      <Button
        icon
        aria-label="Redo"
        title={`Redo (${MOD}+Shift+Z)`}
        disabled={!history.canRedo}
        onClick={() => store.redo()}
      >
        <Redo2 size={16} />
      </Button>
      <Button
        icon
        aria-label={MODE_LABEL[mode]}
        title={MODE_LABEL[mode]}
        onClick={() => onModeChange(NEXT_MODE[mode])}
      >
        <ModeIcon size={16} />
      </Button>
    </header>
  );
}
