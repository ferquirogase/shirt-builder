import type { CSSProperties } from "react";
import { SPLASH_MIN_MS, type SplashPhase } from "@/lib/builder/splash";
import { stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";
import { SplashShirt } from "./SplashShirt";

export function SplashScreen({ phase }: { phase: SplashPhase }) {
  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-label="Cargando GEPE"
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ background: stageBaseCss() }}
    >
      <div className="absolute inset-0" style={{ background: stageGlowCss() }} aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-6" aria-hidden="true">
        {/* The shirt is uncovered from the bottom up by clipping this box. */}
        <div className="splash-reveal">
          <SplashShirt className="splash-shirt h-48 w-auto md:h-64" />
        </div>

        <p className="splash-word text-4xl font-black tracking-tight md:text-5xl">
          GEPE<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
        </p>

        <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
          <div
            className="splash-bar h-full rounded-full bg-accent"
            style={{ "--splash-ms": `${SPLASH_MIN_MS}ms` } as CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}
