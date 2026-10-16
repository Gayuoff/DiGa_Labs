import { LayoutDashboard } from "lucide-react";
import { type CSSProperties, lazy, Suspense, useSyncExternalStore } from "react";
import { Navigate, useParams } from "react-router-dom";
import type { Page } from "@/domain";
import type { ColorMode } from "@/design/colorMode";
import { AddViewButton } from "./AddView";
import { pagePath } from "./routes";
import { useSpec } from "./spec";
import { TopBar } from "./TopBar";
import { ViewFrame } from "./ViewFrame";

const LayoutEditor = lazy(() => import("./LayoutEditor"));

const WIDE_QUERY = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

interface PageScreenProps {
  mode: ColorMode;
  onModeChange: (mode: ColorMode) => void;
  onOpenPalette: () => void;
  editing: boolean;
  onToggleEditing: () => void;
}

/** One page: its top bar, then its views on the 12-column grid (or the layout editor). */
export function PageScreen(props: PageScreenProps) {
  const { pageKey } = useParams();
  const spec = useSpec();
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches);
  const page = spec.pages.find((p) => p.key === pageKey);
  if (!page) return <Navigate to={pagePath(spec.pages[0]!.key)} replace />;
  const editing = props.editing && wide;

  return (
    <>
      <TopBar page={page} {...props} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-[var(--pad)]">
          {page.blocks.length === 0 ? (
            <EmptyPage page={page} />
          ) : editing ? (
            <Suspense fallback={<StaticGrid page={page} />}>
              <LayoutEditor page={page} />
            </Suspense>
          ) : (
            <StaticGrid page={page} />
          )}
          {editing && page.blocks.length > 0 && (
            <div className="mt-[var(--pad)] flex justify-center">
              <AddViewButton pageKey={page.key} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StaticGrid({ page }: { page: Page }) {
  const spec = useSpec();
  return (
    <div className="sb-grid">
      {page.blocks.map((block, index) => {
        const view = spec.views.find((v) => v.key === block.view);
        if (!view) return null;
        const style = {
          "--col": `${block.x + 1} / span ${block.w}`,
          "--row": `${block.y + 1} / span ${block.h}`,
          animationDelay: `${index * 60}ms`,
        } as CSSProperties;
        return (
          <section key={block.view} className="sb-block animate-rise" style={style}>
            <ViewFrame view={view} pageKey={page.key} />
          </section>
        );
      })}
    </div>
  );
}

function EmptyPage({ page }: { page: Page }) {
  return (
    <div className="mx-auto mt-[12vh] flex max-w-sm flex-col items-center gap-3 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-accent-soft text-accent">
        <LayoutDashboard size={22} aria-hidden />
      </span>
      <h2 className="text-lg">This page is empty</h2>
      <p className="text-sm text-muted">
        Add a view to show your items as a list, board, table, calendar or document.
      </p>
      <AddViewButton pageKey={page.key} primary />
    </div>
  );
}
