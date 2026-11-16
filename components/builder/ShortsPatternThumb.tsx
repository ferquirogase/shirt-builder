import type { ShortsRole } from "@/lib/builder/catalog/shorts-patterns";

// A small front view of the shorts in a design's colors, for the shorts' Design grid. Drawn by hand (the
// shorts' designs are a few shapes), with the PDF's proportions in spirit: a band at the hem, a stripe down
// each side, the stripe in two colors with a slanted cut.
const LEG_RIGHT = "M14 22 L48 22 L50 40 L44 84 L10 80 Z"; // the player's right leg, on the viewer's left
const LEG_LEFT = "M52 22 L86 22 L90 80 L56 84 L50 40 Z";

export function ShortsPatternThumb({ patternId, colors }: { patternId: string; colors: Record<ShortsRole, string> }) {
  const clip = `shorts-${patternId}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="aspect-square w-full rounded-xl bg-black/5">
      <defs>
        <clipPath id={clip}>
          <path d={`${LEG_RIGHT} ${LEG_LEFT}`} />
          <rect x="14" y="12" width="72" height="12" rx="2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={colors.primary} />
        {patternId === "shorts-hem-band" && <path d="M0 74 L100 74 L100 100 L0 100 Z" fill={colors.secondary} />}
        {(patternId === "shorts-side-stripe" || patternId === "shorts-side-two-tone") && (
          <>
            <path d="M10 0 L20 0 L18 100 L4 100 Z" fill={colors.secondary} />
            <path d="M80 0 L90 0 L96 100 L82 100 Z" fill={colors.secondary} />
          </>
        )}
        {patternId === "shorts-side-two-tone" && (
          <>
            <path d="M6 66 L18 56 L18 100 L4 100 Z" fill={colors.accent} />
            <path d="M82 56 L94 66 L96 100 L82 100 Z" fill={colors.accent} />
          </>
        )}
      </g>
      <path d={`${LEG_RIGHT} ${LEG_LEFT}`} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <rect x="14" y="12" width="72" height="12" rx="2" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
    </svg>
  );
}
