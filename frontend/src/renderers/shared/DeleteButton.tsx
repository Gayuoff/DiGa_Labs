import { Trash } from "lucide-react";
import { Button } from "@/design/Button";
import { useStore } from "@/store";

/** Soft delete, revealed on hover or keyboard focus. Undo brings the item back. */
export function DeleteButton({ id, title }: { id: string; title: string }) {
  const store = useStore();
  return (
    <Button
      icon
      aria-label={`Delete ${title || "untitled item"}`}
      title="Delete (undo with Ctrl/⌘+Z)"
      className="h-7 w-7 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => store.remove(id)}
    >
      <Trash size={14} />
    </Button>
  );
}
