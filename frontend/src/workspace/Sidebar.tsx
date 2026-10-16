import { clsx } from "clsx";
import { Plus, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Icon } from "@/design/Icon";
import { Kbd, MOD } from "@/design/Kbd";
import { pagePath } from "./routes";
import { useSpec } from "./spec";

interface SidebarProps {
  onOpenPalette: () => void;
  onNewPage: () => void;
}

export function Sidebar({ onOpenPalette, onNewPage }: SidebarProps) {
  const spec = useSpec();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-accent text-sm font-bold text-accent-fg">
          {spec.name.charAt(0)}
        </span>
        <span className="truncate font-semibold">{spec.name}</span>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="mx-3 mb-2 flex items-center gap-2 rounded border border-line bg-canvas px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <Search size={14} aria-hidden />
        <span className="flex-1 text-left">Search</span>
        <Kbd>{MOD}</Kbd>
        <Kbd>K</Kbd>
      </button>

      <nav aria-label="Pages" className="flex-1 space-y-0.5 overflow-y-auto px-2">
        <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted">
          Pages
        </p>
        {spec.pages.map((page) => (
          <NavLink
            key={page.key}
            to={pagePath(page.key)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors",
                isActive ? "bg-accent-soft font-medium text-ink" : "text-muted hover:bg-subtle hover:text-ink",
              )
            }
          >
            <Icon name={page.icon} size={16} />
            <span className="truncate">{page.title}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onNewPage}
          className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <Plus size={16} aria-hidden />
          New page
        </button>
      </nav>

      <p className="border-t border-line px-4 py-3 text-xs text-muted">Saved on this device</p>
    </aside>
  );
}
