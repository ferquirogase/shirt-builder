import { STAGE_GLOW, STAGE_STOPS } from "../stage-style";

// Paints the same background the stage shows on screen (see stage-style.ts).
// CSS "to bottom right" and a corner-to-corner canvas gradient differ slightly
// on non-square canvases; that is acceptable for the exported image.
export function paintStageBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const base = ctx.createLinearGradient(0, 0, width, height);
  for (const [offset, color] of STAGE_STOPS) base.addColorStop(offset, color);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.48;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
  glow.addColorStop(0, STAGE_GLOW);
  glow.addColorStop(0.7, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}
