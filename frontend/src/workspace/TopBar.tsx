import { Monitor, Moon, Redo2, Search, Sun, Undo2 } from "lucide-react";
import type { Page } from "@/domain";
import { Button } from "@/design/Button";
import type { ColorMode } from "@/design/colorMode";
import { Icon } from "@/design/Icon";
import { MOD } from "@/design/Kbd";
import { useHistory, useStore } from "@/store";

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
}

export function TopBar({ page, mode, onModeChange, onOpenPalette }: TopBarProps) {
  const store = useStore();
  const history = useHistory();
  const ModeIcon = MODE_ICON[mode];

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-canvas px-[var(--pad)]">
      <Icon name={page.icon} size={18} className="mr-1.5 text-accent" />
      <h1 className="flex-1 truncate text-base">{page.title}</h1>

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
