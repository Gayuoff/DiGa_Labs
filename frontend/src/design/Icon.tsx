import { Circle } from "lucide-react";
import { ICONS } from "./icons";

interface IconProps {
  /** An icon name from a spec, e.g. "book-open". See ICONS for the full set. */
  name: string | null | undefined;
  size?: number;
  className?: string;
}

/** A spec-named icon. Unknown names fall back to a neutral dot instead of breaking the layout. */
export function Icon({ name, size = 16, className }: IconProps) {
  const Component = (name && ICONS[name]) || Circle;
  return <Component size={size} className={className} aria-hidden />;
}
