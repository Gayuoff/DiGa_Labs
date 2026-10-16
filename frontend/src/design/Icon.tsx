import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Circle } from "lucide-react";

interface IconProps {
  /** A lucide icon name from a spec, e.g. "book-open". */
  name: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Icons named by a spec load one by one, so a workspace downloads only the icons it uses.
 * Unknown names fall back to a neutral dot instead of breaking the layout.
 */
export function Icon({ name, size = 16, className }: IconProps) {
  const fallback = () => <Circle size={size} className={className} aria-hidden />;
  if (!name) return fallback();
  return (
    <DynamicIcon
      name={name as IconName}
      size={size}
      className={className}
      fallback={fallback}
      aria-hidden
    />
  );
}
