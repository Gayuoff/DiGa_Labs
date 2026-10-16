import { BrowserRouter } from "react-router-dom";
import type { Spec } from "@/domain";
import { StoreProvider, type WorkspaceStore } from "@/store";
import { Shell } from "@/workspace/Shell";
import { SpecProvider } from "@/workspace/spec";

export function App({ store, spec }: { store: WorkspaceStore; spec: Spec }) {
  return (
    <StoreProvider value={store}>
      <SpecProvider value={spec}>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </SpecProvider>
    </StoreProvider>
  );
}
