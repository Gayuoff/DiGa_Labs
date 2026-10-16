import type { Spec } from "@/domain";
import { useWorkspaceSpec } from "@/store";

/** The current workspace spec, live from the store. The app sets one before rendering. */
export function useSpec(): Spec {
  const spec = useWorkspaceSpec();
  if (!spec) throw new Error("The workspace has no spec yet");
  return spec;
}
