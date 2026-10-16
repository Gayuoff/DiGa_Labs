import { Trash } from "lucide-react";
import { Button } from "@/design/Button";
import { toast } from "@/design/toast";
import { useStore } from "@/store";

/** Soft delete, revealed on hover or keyboard focus, with an Undo offer. */
export function DeleteButton({ id, title }: { id: string; title: string }) {
  const store = useStore();
  const name = title || "untitled item";
  return (
    <Button
      icon
      aria-label={`Delete ${name}`}
      title="Delete (undo with Ctrl/⌘+Z)"
      className="h-7 w-7 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        store.remove(id);
        toast(`Deleted “${name}”`, { label: "Undo", run: () => store.undo() });
      }}
    >
      <Trash size={14} />
    </Button>
  );
}
