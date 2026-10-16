import { BrowserRouter } from "react-router-dom";
import { StoreProvider, type WorkspaceStore } from "@/store";
import { Shell } from "@/workspace/Shell";

/** The app for one workspace. Its spec and data both come from the store. */
export function App({ store }: { store: WorkspaceStore }) {
  return (
    <StoreProvider value={store}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </StoreProvider>
  );
}
