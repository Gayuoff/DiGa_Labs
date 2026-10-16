import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useApplyTheme, useColorMode } from "@/design/colorMode";
import { Toaster } from "@/design/toast";
import { addPage } from "@/spec/ops";
import { useStore } from "@/store";
import { buildCommands } from "./commands";
import { CommandPalette } from "./CommandPalette";
import { useEditSpec } from "./editSpec";
import { PageScreen } from "./PageScreen";
import { pagePath } from "./routes";
import { Sidebar } from "./Sidebar";
import { useSpec } from "./spec";
import { useShortcuts } from "./useShortcuts";

export function Shell() {
  const spec = useSpec();
  const store = useStore();
  const edit = useEditSpec();
  const navigate = useNavigate();
  const { mode, dark, setMode } = useColorMode(spec.theme.mode);
  useApplyTheme(spec.theme, dark);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  const toggleEditing = useCallback(() => setEditing((on) => !on), []);
  const undo = useCallback(() => void store.undo(), [store]);
  const redo = useCallback(() => void store.redo(), [store]);
  useShortcuts({ palette: togglePalette, undo, redo });

  const newPage = useCallback(() => {
    let pageKey = "";
    const added = edit((s) => {
      const result = addPage(s, "Untitled page");
      pageKey = result.pageKey;
      return result.spec;
    });
    if (added) navigate(pagePath(pageKey));
  }, [edit, navigate]);

  // Escape leaves layout editing, unless something else (a menu, the palette) handled it.
  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setEditing(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing]);

  const commands = useMemo(
    () =>
      buildCommands({
        spec,
        store,
        navigate,
        setMode,
        editing,
        onToggleEditing: toggleEditing,
        onNewPage: newPage,
      }),
    [spec, store, navigate, setMode, editing, toggleEditing, newPage],
  );

  return (
    <div className="flex h-full">
      <Sidebar onOpenPalette={openPalette} onNewPage={newPage} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Routes>
          <Route
            path="/p/:pageKey"
            element={
              <PageScreen
                mode={mode}
                onModeChange={setMode}
                onOpenPalette={openPalette}
                editing={editing}
                onToggleEditing={toggleEditing}
              />
            }
          />
          <Route path="*" element={<Navigate to={pagePath(spec.pages[0]!.key)} replace />} />
        </Routes>
      </main>
      <CommandPalette open={paletteOpen} commands={commands} onClose={closePalette} />
      <Toaster />
    </div>
  );
}
