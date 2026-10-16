import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface ToastAction {
  label: string;
  run: () => void;
}

interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

const VISIBLE_MS = 6000;
const MAX_TOASTS = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** A short message at the bottom of the screen, e.g. "Removed Inbox" with an Undo button. */
export function toast(message: string, action?: ToastAction): void {
  const id = nextId++;
  toasts = [...toasts, { id, message, action }].slice(-MAX_TOASTS);
  emit();
  setTimeout(() => dismiss(id), VISIBLE_MS);
}

/** The message from anything thrown, for showing to people. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Toaster() {
  const current = useSyncExternalStore(subscribe, () => toasts);
  return createPortal(
    <div
      role="status"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {current.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-lg bg-ink py-2 pl-4 pr-2 text-sm text-canvas shadow-xl"
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="rounded px-2 py-1 font-semibold text-accent hover:bg-white/10"
              onClick={() => {
                t.action?.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded p-1 opacity-70 hover:bg-white/10 hover:opacity-100"
            onClick={() => dismiss(t.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
