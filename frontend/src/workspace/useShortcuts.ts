import { useEffect } from "react";
import { isMac } from "@/design/Kbd";

interface ShortcutHandlers {
  palette: () => void;
  undo: () => void;
  redo: () => void;
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * Global shortcuts: mod+K opens the palette anywhere; mod+Z / mod+Shift+Z (or Ctrl+Y) undo and
 * redo workspace changes, except inside text fields, which keep their own text undo.
 */
export function useShortcuts({ palette, undo, redo }: ShortcutHandlers): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        palette();
        return;
      }
      if (isEditable(event.target)) return;
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y" && !isMac) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [palette, undo, redo]);
}
