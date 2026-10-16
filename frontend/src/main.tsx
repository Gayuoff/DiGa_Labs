import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { indexedDbPersistence, WorkspaceStore } from "./store";
import { seedStudyHq, STUDY_HQ } from "./workspace/examples";

const WORKSPACE = { workspaceId: "local-demo", actorId: "local-user" };

/** The local workspace, or an in-memory one when this browser blocks IndexedDB. */
async function openStore(): Promise<WorkspaceStore> {
  try {
    return await WorkspaceStore.open({ ...WORKSPACE, persistence: indexedDbPersistence() });
  } catch (error) {
    console.warn("[boot] local storage unavailable; changes will not survive a reload", error);
    return new WorkspaceStore(WORKSPACE);
  }
}

void openStore().then((store) => {
  // Until the Architect AI (step 2) builds workspaces from a prompt, start from Study HQ.
  store.initSpec(STUDY_HQ);
  if (store.isEmpty()) seedStudyHq(store);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App store={store} />
    </StrictMode>,
  );
});
