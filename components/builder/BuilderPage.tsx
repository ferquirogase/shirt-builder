"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DesignProvider } from "@/lib/builder/state/design-context";
import type { DesignState } from "@/lib/builder/state/design-state";
import { captureViews } from "@/lib/builder/io/capture-views";
import type { ShirtViews } from "@/lib/share/compose-story";
import { shirtImageOf } from "@/lib/share/shirt-image";
import { useShareStory } from "@/lib/share/use-share-story";
import { ShareStoryDialog } from "@/components/share/ShareStoryDialog";
import { orderFromDesign } from "@/lib/checkout/order";
import { loadOrder, saveOrder } from "@/lib/checkout/order-storage";
import { pause } from "@/lib/checkout/pause";
import { captureThumbnails } from "@/lib/checkout/thumbnails";
import { stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";
import type { ViewSide } from "@/lib/builder/geometry/camera-math";
import { Header } from "./Header";
import { RestoreOrderDesign } from "./RestoreOrderDesign";
import { SectionNav, type SectionId } from "./SectionNav";
import { StageToolbar } from "./viewer/StageToolbar";
import { Viewer3D } from "./viewer/Viewer3D";
import { ViewerControls } from "./viewer/ViewerControls";
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
  // Mobile only: the section panel is a bottom sheet that can be folded to give
  // the viewer the screen. The desktop column is never folded.
  const [panelOpen, setPanelOpen] = useState(true);
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  function requestView(side: ViewSide, reset = false) {
    setView(side);
    setResetPose(reset);
    setViewToken((token) => token + 1);
  }

  // Tapping the active tab folds or unfolds the panel; another tab opens it on that section.
  function handleSectionChange(id: SectionId) {
    if (id === section) {
      setPanelOpen((open) => !open);
      return;
    }
    setSection(id);
    setPanelOpen(true);
  }

  // The two sides of the shirt for the story image: the camera turns (visibly,
  // behind the dialog) and each side is copied with its transparency.
  async function captureShirts(signal: AbortSignal): Promise<ShirtViews | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return captureViews(
      { canvas, signal, showView: (side) => requestView(side, true), wait: pause },
      (source) => shirtImageOf(source)
    );
  }

  const story = useShareStory(captureShirts);
  const sharing = story.state.status !== "closed";

  // "Revisar diseño": freeze the design, photograph both sides from the 3D
  // viewer (the camera visibly turns while we do), keep it as an order and go
  // to the checkout. A failed capture only costs the thumbnails.
  async function handleReview(design: DesignState) {
    if (reviewing || sharing) return;
    setReviewing(true);
    let thumbnails = null;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        thumbnails = await captureThumbnails({
          canvas,
          showView: (side) => requestView(side, true),
          wait: pause,
        });
      } catch {
        thumbnails = null;
      }
    }
    saveOrder(orderFromDesign(design, thumbnails, loadOrder()));
    router.push("/checkout", { transitionTypes: ["nav-forward"] });
  }

  return (
    <DesignProvider>
      <RestoreOrderDesign />
      <div className="min-h-dvh">
        <main
          className="flex h-dvh flex-col overflow-hidden"
          style={{ background: stageBaseCss() }}
        >
          <Header onReview={handleReview} onShare={story.open} reviewing={reviewing} sharing={sharing} />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Stage: first on mobile, last on desktop. */}
            <div className="relative order-1 min-h-[14rem] flex-1 md:order-3" style={{ background: stageGlowCss() }}>
              {/* The canvas fills the stage; the toolbar and the Frente/Espalda controls float over it,
                  in the margins the camera leaves above and below the shirt. */}
              <div className="absolute inset-0">
                <Viewer3D
                  ref={canvasRef}
                  view={view}
                  viewToken={viewToken}
                  resetPose={resetPose}
                  onInteract={() => setInteracted(true)}
                />
              </div>
              <StageToolbar />
              <ViewerControls
                view={view}
                onViewChange={requestView}
                onReset={() => requestView("front", true)}
                showHint={!interacted}
              />
            </div>

            {/* Section panel: foldable bottom sheet on mobile, middle column on desktop. */}
            <div className="order-2 rounded-t-3xl bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mb-4 md:mr-2 md:w-[22rem] md:shrink-0 md:overflow-y-auto md:rounded-3xl md:bg-white/60 md:shadow-none md:backdrop-blur">
              <button
                type="button"
                aria-expanded={panelOpen}
                aria-controls="section-panel"
                aria-label={panelOpen ? "Plegar panel" : "Desplegar panel"}
                onClick={() => setPanelOpen((open) => !open)}
                className="flex h-9 w-full items-center justify-center md:hidden"
              >
                <span aria-hidden="true" className="h-1 w-10 rounded-full bg-black/20" />
              </button>
              {/* Folded = invisible and zero-height on mobile only; it stays mounted so nothing typed is lost. */}
              <div
                id="section-panel"
                className={["max-md:overflow-y-auto", panelOpen ? "max-md:max-h-[28dvh]" : "max-md:invisible max-md:max-h-0"].join(" ")}
              >
                <SectionPanel section={section} />
              </div>
            </div>

            {/* Navigation: tab bar on mobile, sidebar (first) on desktop. */}
            <div className="order-3 md:order-1">
              <SectionNav active={section} onChange={handleSectionChange} />
            </div>
          </div>
        </main>
        <ShareStoryDialog
          state={story.state}
          onShare={story.share}
          onAnother={story.anotherPhrase}
          onRetry={story.retry}
          onClose={story.close}
        />
      </div>
    </DesignProvider>
  );
}
