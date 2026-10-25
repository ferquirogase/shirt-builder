import { STAGE_COLOR, STAGE_GLOW } from "../stage-style";

// Paints the same background the stage shows on screen (see stage-style.ts).
export function paintStageBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = STAGE_COLOR;
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.48;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
  glow.addColorStop(0, STAGE_GLOW);
  glow.addColorStop(0.7, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}
