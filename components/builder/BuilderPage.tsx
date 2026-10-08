"use client";
import { useRef, useState } from "react";
import { DesignProvider } from "@/lib/builder/design-context";
import { exportStagePng } from "@/lib/builder/export-image";
import { stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";
import type { ViewSide } from "@/lib/builder/camera-math";
import { Header } from "./Header";
import { SectionNav, type SectionId } from "./SectionNav";
import { StageToolbar } from "./StageToolbar";
import { Viewer3D } from "./Viewer3D";
import { ViewerControls } from "./ViewerControls";
import { ArrowRightIcon } from "./icons";
import { ColorsPanel } from "./panels/ColorsPanel";
import { CrestPanel } from "./panels/CrestPanel";
import { DesignPanel } from "./panels/DesignPanel";
import { SponsorPanel } from "./panels/SponsorPanel";
import { TextPanel } from "./panels/TextPanel";

function SectionPanel({ section }: { section: SectionId }) {
  switch (section) {
    case "diseno":
      return <DesignPanel />;
    case "colores":
      return <ColorsPanel />;
    case "escudo":
      return <CrestPanel />;
    case "sponsor":
      return <SponsorPanel />;
    case "texto":
      return <TextPanel />;
  }
}

export function BuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [section, setSection] = useState<SectionId>("diseno");
  const [view, setView] = useState<ViewSide>("front");
  const [viewToken, setViewToken] = useState(0);
  const [resetPose, setResetPose] = useState(false);
  const [interacted, setInteracted] = useState(false);

  function requestView(side: ViewSide, reset = false) {
    setView(side);
    setResetPose(reset);
    setViewToken((token) => token + 1);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = exportStagePng(canvas);
    if (!url) return;
    const link = document.createElement("a");
    link.download = "mi-camiseta.png";
    link.href = url;
    link.click();
  }

  return (
    <DesignProvider>
      <div className="min-h-dvh">
        <main
          className="flex h-dvh flex-col overflow-hidden"
          style={{ background: stageBaseCss() }}
        >
          <Header />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Stage: first on mobile, last on desktop. */}
            <div className="relative order-1 min-h-[16rem] flex-1 md:order-3" style={{ background: stageGlowCss() }}>
              {/* On mobile the canvas sits between the toolbar and the Frente/Espalda controls so neither covers the jersey. */}
              <div className="absolute inset-x-0 bottom-24 top-14 md:bottom-0 md:top-0">
                <Viewer3D
                  ref={canvasRef}
                  view={view}
                  viewToken={viewToken}
                  resetPose={resetPose}
                  onInteract={() => setInteracted(true)}
                />
              </div>
              <StageToolbar onDownload={handleDownload} />
              <ViewerControls
                view={view}
                onViewChange={requestView}
                onReset={() => requestView("front", true)}
                showHint={!interacted}
              />
            </div>

            {/* Section panel: bottom sheet on mobile, middle column on desktop. */}
            <div className="order-2 max-h-[34dvh] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mb-4 md:mr-2 md:max-h-none md:w-[22rem] md:shrink-0 md:rounded-3xl md:bg-white/60 md:shadow-none md:backdrop-blur">
              <SectionPanel section={section} />
            </div>

            {/* Navigation: tab bar on mobile, sidebar (first) on desktop. */}
            <div className="order-3 md:order-1">
              <SectionNav active={section} onChange={setSection} />
            </div>

            {/* Mobile-only call to action (desktop has it in the header). */}
            <div className="order-4 bg-white px-4 pb-4 md:hidden">
              <button
                type="button"
                disabled
                title="Próximamente"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Revisar diseño
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </DesignProvider>
  );
}
