import { OUTLINE_COLOR, OUTLINE_WIDTH, type NameNumberPreset, type NameNumberStyle } from "../catalog/name-number-presets";

// What the back shows while the player has typed no name and no number: an example of each, so the
// design reads from the start and the user sees where they go. They are only drawn: the order keeps
// what was typed.
export const NAME_PLACEHOLDER = "NOMBRE";
export const NUMBER_PLACEHOLDER = "10";

export function displayNumber(design: { playerNumber: string }): string {
  const typed = design.playerNumber.trim();
  return typed === "" ? NUMBER_PLACEHOLDER : typed;
}

export function displayName(design: { playerName: string }): string {
  return design.playerName.trim() === "" ? NAME_PLACEHOLDER : design.playerName;
}

// The example name is shown while there is no name, unless the sponsor of the upper back is in use:
// it is printed on the same strip of the back, so the example makes way for it.
export function showsNamePlaceholder(design: {
  playerName: string;
  sponsors: Partial<Record<string, unknown>>;
}): boolean {
  return design.playerName.trim() === "" && !design.sponsors["upper-back"];
}

export type StyledTextOptions = {
  basePx: number;
  /** The widest the text may be once drawn (after the squeeze), in canvas pixels. */
  maxWidth: number;
  style: NameNumberStyle;
  preset: NameNumberPreset;
  fontFamily: string;
  /** Turned by this many radians about its center: the back of the shirt is drawn upside-down (PI). */
  rotation?: number;
  /** Squeezed sideways by this much before turning (the shorts' texture, see SHORTS_UV_STRETCH). */
  squeeze?: number;
};

// Draws outline -> fill, centered on (x, y), in the name and number style.
export function drawStyledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { basePx, maxWidth, style, preset, fontFamily, rotation = 0, squeeze = 1 }: StyledTextOptions
): void {
  ctx.save();
  const fontFor = (px: number) => `${preset.weight} ${px}px ${fontFamily}`;
  ctx.font = fontFor(basePx);
  ctx.textAlign = "center";
  const measured = ctx.measureText(text).width * squeeze;
  const px = measured > maxWidth ? basePx * (maxWidth / measured) : basePx;
  ctx.font = fontFor(px);

  ctx.translate(x, y);
  if (squeeze !== 1) ctx.scale(squeeze, 1);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.lineJoin = "round";

  if (style.outline) {
    // A stroke is centered on the glyph edge and the fill covers its inner
    // half, so the line is twice the visible thickness.
    ctx.lineWidth = px * OUTLINE_WIDTH * 2;
    // A design saved before the border had a color has none: it keeps the black it always had.
    ctx.strokeStyle = style.outlineColor ?? OUTLINE_COLOR;
    ctx.strokeText(text, 0, 0);
  }

  ctx.fillStyle = style.fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
