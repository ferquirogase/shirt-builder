import type { CSSProperties } from "react";
import { SPLASH_MIN_MS, type SplashPhase } from "@/lib/builder/splash";
import { stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";

// The shirt is drawn in a 200x200 box: first its outline is traced, then the stripes rise
// inside it, then the collar is picked out and the whole shirt breathes until the builder is ready.
const SHIRT = "M72 18 L22 48 L40 92 L68 80 L68 184 L132 184 L132 80 L160 92 L178 48 L128 18 C122 34 78 34 72 18 Z";
const COLLAR = "M72 18 C78 34 122 34 128 18";
const STRIPES = Array.from({ length: 6 }, (_, i) => ({ x: 22 + i * 26, fill: i % 2 === 0 ? "#0a5c36" : "#ffffff" }));
const STRIPE_DELAY_MS = 900;
const STRIPE_STEP_MS = 90;

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
        <svg viewBox="0 0 200 200" className="splash-shirt h-44 w-44 md:h-56 md:w-56">
          <defs>
            <clipPath id="splash-shirt-clip">
              <path d={SHIRT} />
            </clipPath>
          </defs>
          <g clipPath="url(#splash-shirt-clip)">
            {STRIPES.map((stripe, i) => (
              <rect
                key={stripe.x}
                className="splash-stripe"
                x={stripe.x}
                y={0}
                width={26}
                height={200}
                fill={stripe.fill}
                style={{ "--delay": `${STRIPE_DELAY_MS + i * STRIPE_STEP_MS}ms` } as CSSProperties}
              />
            ))}
          </g>
          <path
            className="splash-outline"
            d={SHIRT}
            pathLength={1}
            fill="none"
            stroke="#1c1917"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <path
            className="splash-collar"
            d={COLLAR}
            pathLength={1}
            fill="none"
            stroke="#f5b700"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </svg>

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
