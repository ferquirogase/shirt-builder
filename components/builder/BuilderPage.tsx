"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DesignProvider } from "@/lib/builder/state/design-context";
import type { DesignState, LookTarget } from "@/lib/builder/state/design-state";
import { captureViews } from "@/lib/builder/io/capture-views";
import type { ShirtViews } from "@/lib/share/compose-story";
import { shirtImageOf } from "@/lib/share/shirt-image";
import { useShareStory } from "@/lib/share/use-share-story";
import { ShareStoryDialog } from "@/components/share/ShareStoryDialog";
import { orderFromDesign } from "@/lib/checkout/order";
import {
  clearDesignImages,
  clearKeeperDesignImages,
  loadOrder,
  saveDesignImages,
  saveKeeperDesignImages,
  saveOrder,
} from "@/lib/checkout/order-storage";
import { pause } from "@/lib/checkout/pause";
import { captureDesignImages } from "@/lib/checkout/thumbnails";
import { stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";
import type { ViewSide } from "@/lib/builder/geometry/camera-math";
import { useModelReady } from "@/lib/builder/use-model-ready";
import { useSplash } from "@/lib/builder/use-splash";
import { Header } from "./Header";
import { RestoreOrderDesign } from "./RestoreOrderDesign";
import { SplashScreen } from "./SplashScreen";
import { SectionNav } from "./SectionNav";
import { StepFrame } from "./StepFrame";
import { Viewer3D } from "./viewer/Viewer3D";
import { ViewerControls } from "./viewer/ViewerControls";
import { GarmentPanel } from "./panels/GarmentPanel";
import { LogosPanel } from "./panels/LogosPanel";
import { OrderPanel } from "./panels/OrderPanel";
import { ShortsPanel } from "./panels/ShortsPanel";
import { useGoToStep } from "./use-go-to-step";
import { nextStep, type StepId } from "@/lib/builder/steps";

type ReviewFn = (design: DesignState, showKit: (target: LookTarget) => void) => void;

function StepPanel({ step, onGo, onReview, busy }: { step: StepId; onGo: (id: StepId) => void; onReview: ReviewFn; busy: boolean }) {
  const goTo = useGoToStep(onGo);
  // Leaving an optional garment out goes on to the step after it.
  const skip = () => goTo(nextStep(step)!);
  switch (step) {
    case "player":
      return <GarmentPanel garment="player" />;
    case "shorts":
      return <ShortsPanel onSkip={skip} />;
    case "keeper":
      return <GarmentPanel garment="keeper" onSkip={skip} />;
    case "logos":
      return <LogosPanel />;
    case "order":
      return <OrderPanel onGo={onGo} onReview={onReview} busy={busy} />;
  }
}

export function BuilderPage() {
  const splash = useSplash(useModelReady());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [section, setSection] = useState<StepId>("player");
  // The steps that were left at least once: the line ticks them as done.
  const [visited, setVisited] = useState<ReadonlySet<StepId>>(() => new Set());
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

  // Opening another step leaves this one: it counts as done (or, for a garment not added, left out).
  function goToStep(id: StepId) {
    if (id === section) return;
    setVisited((seen) => new Set(seen).add(section));
    setSection(id);
    setPanelOpen(true);
  }

  // Tapping the current step on the line folds or unfolds the panel; another step opens it there.
  function handleSectionChange(id: StepId) {
    if (id === section) {
      setPanelOpen((open) => !open);
      return;
    }
    goToStep(id);
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
  // to the checkout. A failed capture only costs the images.
  async function handleReview(design: DesignState, showKit: (target: LookTarget) => void) {
    if (reviewing || sharing) return;
    setReviewing(true);
    let captured = null;
    let keeperCaptured: Awaited<ReturnType<typeof captureDesignImages>> = null;
    const canvas = canvasRef.current;
    if (canvas) {
      // The player's photos must show the player's shirt, whatever the viewer was showing.
      showKit("player");
      const options = { canvas, showView: (side: ViewSide) => requestView(side, true), wait: pause };
      try {
        captured = await captureDesignImages(options);
      } catch {
        captured = null;
      }
      // The keeper's shirt is photographed after the player's: the viewer shows it for a moment,
      // then goes back to the player. Both sizes, like the player's: the AI try-on can use either.
      if (captured && design.keeper.included) {
        showKit("keeper");
        try {
          keeperCaptured = await captureDesignImages(options);
        } catch {
          keeperCaptured = null;
        } finally {
          showKit("player");
        }
      }
    }
    // The big images (for the AI try-on) are kept apart; stale ones must not outlive a failed capture.
    if (captured) saveDesignImages(captured.images);
    else clearDesignImages();
    if (keeperCaptured) saveKeeperDesignImages(keeperCaptured.images);
    else clearKeeperDesignImages();
    saveOrder(orderFromDesign(design, captured?.thumbnails ?? null, loadOrder(), keeperCaptured?.thumbnails ?? null));
    router.push("/checkout", { transitionTypes: ["nav-forward"] });
  }

  return (
    <DesignProvider>
      <RestoreOrderDesign />
      <SplashScreen phase={splash} />
      {/* Out of reach (keyboard and screen readers too) until the splash lets go. */}
      <div className="min-h-dvh" inert={splash === "showing"}>
        <main
          className="flex h-dvh flex-col overflow-hidden"
          style={{ background: stageBaseCss() }}
        >
          <Header onReview={handleReview} onShare={story.open} reviewing={reviewing} sharing={sharing} />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Stage: first on mobile, last on desktop. */}
            <div className="relative order-1 min-h-[14rem] flex-1 md:order-3" style={{ background: stageGlowCss() }}>
              {/* The canvas fills the stage; the Frente/Espalda controls float over it, in the margin the
                  camera leaves below the shirt. */}
              <div className="absolute inset-0">
                <Viewer3D
                  ref={canvasRef}
                  view={view}
                  viewToken={viewToken}
                  resetPose={resetPose}
                  onInteract={() => setInteracted(true)}
                />
              </div>
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
                className={["max-md:overflow-y-auto", panelOpen ? "max-md:max-h-[34dvh]" : "max-md:invisible max-md:max-h-0"].join(" ")}
              >
                <StepFrame step={section} visited={visited} onGo={goToStep}>
                  <StepPanel step={section} onGo={goToStep} onReview={handleReview} busy={reviewing || sharing} />
                </StepFrame>
              </div>
            </div>

            {/* Navigation: tab bar on mobile, sidebar (first) on desktop. */}
            <div className="order-3 md:order-1">
              <SectionNav active={section} visited={visited} onChange={handleSectionChange} />
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
