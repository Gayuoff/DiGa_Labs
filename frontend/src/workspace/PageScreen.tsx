import type { CSSProperties } from "react";
import { Navigate, useParams } from "react-router-dom";
import type { ColorMode } from "@/design/colorMode";
import { pagePath } from "./routes";
import { useSpec } from "./spec";
import { TopBar } from "./TopBar";
import { ViewFrame } from "./ViewFrame";

interface PageScreenProps {
  mode: ColorMode;
  onModeChange: (mode: ColorMode) => void;
  onOpenPalette: () => void;
}

/** One page: its top bar, then its views placed on the 12-column grid from the spec. */
export function PageScreen(props: PageScreenProps) {
  const { pageKey } = useParams();
  const spec = useSpec();
  const page = spec.pages.find((p) => p.key === pageKey);
  if (!page) return <Navigate to={pagePath(spec.pages[0]!.key)} replace />;

  return (
    <>
      <TopBar page={page} {...props} />
      <div className="flex-1 overflow-y-auto">
        <div className="sb-grid p-[var(--pad)]">
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
                <ViewFrame view={view} />
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
