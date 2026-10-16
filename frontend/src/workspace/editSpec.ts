import { useCallback } from "react";
import type { Spec } from "@/domain";
import { errorMessage, toast } from "@/design/toast";
import { useStore } from "@/store";

/**
 * Apply a spec operation from the UI. The store validates and records it (one undo step); any
 * refusal is shown as a message instead of thrown. With `undoLabel`, a toast offers Undo, for
 * changes that remove things.
 */
export function useEditSpec() {
  const store = useStore();
  return useCallback(
    (change: (spec: Spec) => Spec, undoLabel?: string): boolean => {
      const current = store.spec;
      if (!current) return false;
      try {
        store.changeSpec(change(current));
      } catch (error) {
        toast(errorMessage(error));
        return false;
      }
      if (undoLabel) toast(undoLabel, { label: "Undo", run: () => store.undo() });
      return true;
    },
    [store],
  );
}
