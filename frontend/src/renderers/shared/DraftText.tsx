import {
  type ChangeEvent,
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";

interface DraftTextProps {
  value: string;
  onSave: (value: string) => void;
  ariaLabel: string;
  /** Save while typing after this pause. Without it, saves on blur and Enter only. */
  debounceMs?: number;
  multiline?: boolean;
  type?: "text" | "url" | "number";
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Text that edits locally and saves in one step, so typing a sentence is one undo step, not one
 * per key. Changes from elsewhere (undo, sync) replace the text unless the person is typing in it.
 */
export function DraftText({
  value,
  onSave,
  ariaLabel,
  debounceMs,
  multiline = false,
  type = "text",
  placeholder,
  className,
  style,
}: DraftTextProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  // What was typed, tracked here rather than read from the element: on unmount React detaches the
  // element before cleanups run, and the last pending edit must still be saved.
  const typed = useRef(value);
  const saved = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (typed.current !== saved.current) {
      saved.current = typed.current;
      onSaveRef.current(typed.current);
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (element && value !== saved.current && document.activeElement !== element) {
      element.value = value;
      typed.current = value;
      saved.current = value;
    }
  }, [value]);

  // Keep what was typed even if the editor unmounts mid-pause (e.g. switching notes).
  useEffect(() => flush, [flush]);

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    typed.current = event.currentTarget.value;
    if (debounceMs === undefined) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, debounceMs);
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as RefObject<HTMLTextAreaElement>}
        defaultValue={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={className}
        style={style}
        onChange={onChange}
        onBlur={flush}
      />
    );
  }
  return (
    <input
      ref={ref as RefObject<HTMLInputElement>}
      type={type}
      defaultValue={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      style={style}
      onChange={onChange}
      onBlur={flush}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          event.currentTarget.value = saved.current;
          typed.current = saved.current;
          event.currentTarget.blur();
        }
      }}
    />
  );
}
