// Single source of truth for the stage background so the on-screen CSS
// gradient and the exported PNG (canvas) look the same.
export const STAGE_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, "#f4f4f2"],
  [0.5, "#ebe7de"],
  [1, "#f6d975"],
];

export const STAGE_GLOW = "rgba(255,255,255,0.85)";

// Card-wide background: the warm diagonal gradient.
export function stageBaseCss(): string {
  const stops = STAGE_STOPS.map(([offset, color]) => `${color} ${Math.round(offset * 100)}%`).join(", ");
  return `linear-gradient(to bottom right, ${stops})`;
}

// Soft light behind the jersey. Applied to the stage container only, so it is
// centered on the jersey (and matches the exported PNG, which is stage-sized).
export function stageGlowCss(): string {
  return `radial-gradient(55% 55% at 50% 48%, ${STAGE_GLOW} 0%, rgba(255,255,255,0) 70%)`;
}
