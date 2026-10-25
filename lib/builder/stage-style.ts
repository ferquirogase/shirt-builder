// Single source of truth for the stage background so the on-screen CSS
// and the exported PNG (canvas) look the same.
// One flat light grey: the diagonal gradient that ended in yellow is gone.
export const STAGE_COLOR = "#f4f4f2";

export const STAGE_GLOW = "rgba(255,255,255,0.85)";

// Card-wide background: the flat stage color.
export function stageBaseCss(): string {
  return STAGE_COLOR;
}

// Soft light behind the jersey. Applied to the stage container only, so it is
// centered on the jersey (and matches the exported PNG, which is stage-sized).
export function stageGlowCss(): string {
  return `radial-gradient(55% 55% at 50% 48%, ${STAGE_GLOW} 0%, rgba(255,255,255,0) 70%)`;
}
