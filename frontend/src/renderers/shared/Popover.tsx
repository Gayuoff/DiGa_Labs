import { clsx } from "clsx";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const GAP = 4;
const EDGE = 8;

/**
 * A floating panel attached to an element. Rendered in a portal so scrolling tables and cards
 * never clip it; flips above the anchor near the bottom of the screen. Closes on outside click,
 * Escape, scroll and resize.
 */
export function Popover({ anchor, onClose, children, className }: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const height = panel.current?.offsetHeight ?? 0;
    const width = panel.current?.offsetWidth ?? 0;
    const fitsBelow = rect.bottom + GAP + height <= window.innerHeight;
    const top = fitsBelow || rect.top - GAP - height < 0 ? rect.bottom + GAP : rect.top - GAP - height;
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE));
    setPosition({ top, left, minWidth: rect.width });
  }, [anchor]);

  useEffect(() => {
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (panel.current?.contains(target) || anchor.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
      anchor.focus();
    };
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node && panel.current?.contains(event.target))) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={panel}
      className={clsx(
        "fixed z-50 animate-fade rounded border border-line bg-surface p-1 shadow-lg",
        className,
      )}
      style={
        position
          ? { top: position.top, left: position.left, minWidth: position.minWidth }
          : { top: 0, left: 0, visibility: "hidden" }
      }
    >
      {children}
    </div>,
    document.body,
  );
}
