import { useCallback, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useApplyTheme, useColorMode } from "@/design/colorMode";
import { useStore } from "@/store";
import { buildCommands } from "./commands";
import { CommandPalette } from "./CommandPalette";
import { PageScreen } from "./PageScreen";
import { pagePath } from "./routes";
import { Sidebar } from "./Sidebar";
import { useSpec } from "./spec";
import { useShortcuts } from "./useShortcuts";

export function Shell() {
  const spec = useSpec();
  const store = useStore();
  const navigate = useNavigate();
  const { mode, dark, setMode } = useColorMode(spec.theme.mode);
  useApplyTheme(spec.theme, dark);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  const undo = useCallback(() => void store.undo(), [store]);
  const redo = useCallback(() => void store.redo(), [store]);
  useShortcuts({ palette: togglePalette, undo, redo });

  const commands = useMemo(
    () => buildCommands({ spec, store, navigate, setMode }),
    [spec, store, navigate, setMode],
  );

  return (
    <div className="flex h-full">
      <Sidebar onOpenPalette={openPalette} />
      <main className="flex min-w-0 flex-1 flex-col">
        <Routes>
          <Route
            path="/p/:pageKey"
            element={<PageScreen mode={mode} onModeChange={setMode} onOpenPalette={openPalette} />}
          />
          <Route path="*" element={<Navigate to={pagePath(spec.pages[0]!.key)} replace />} />
        </Routes>
      </main>
      <CommandPalette open={paletteOpen} commands={commands} onClose={closePalette} />
    </div>
  );
}
