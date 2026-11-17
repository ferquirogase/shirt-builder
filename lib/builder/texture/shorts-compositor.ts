import {
  SHORTS_CREST_BOX_FRACTION,
  SHORTS_CREST_STRETCH,
  SHORTS_FRONT_LAYOUT,
  SHORTS_HEM_BAND_TOP_V,
  SHORTS_NUMBER_FONT_FRACTION,
  SHORTS_SIDE_SEAM,
  SHORTS_SIDE_STRIPE_HALF_WIDTH,
  SHORTS_TWO_TONE_SPLIT,
  SHORTS_UV_REGIONS,
  SHORTS_UV_STRETCH,
} from "../geometry/shorts-uv-regions";
import { UV_FLIP_Y } from "../geometry/uv-regions";
import { getNameNumberPreset } from "../catalog/name-number-presets";
import { availableSponsorSlots, clampSponsorScale, isShortsSlot, type SponsorSlotId } from "../catalog/sponsor-slots";
import type { DesignState } from "../state/design-state";
import { BRAND_BOX_FRACTION, drawBrandLogoAt, fitLogoBox, pointInRegionToCanvas } from "./texture-compositor";
import { displayNumber, drawStyledText } from "./number-text";

export type ShortsCompositorImages = {
  /** Decoded sponsor images, by placement; a missing or null one is not drawn. */
  sponsorImages?: Partial<Record<SponsorSlotId, HTMLImageElement | null>>;
  /** The crest the player uploaded or made, drawn under sponsor 12. */
  logoImage?: HTMLImageElement | null;
  /** The maker's logo, under the number: the version for light cloth and the one for dark cloth. */
  brandLogoForLight?: HTMLImageElement | null;
  brandLogoForDark?: HTMLImageElement | null;
};

// Paints the shorts' texture: their color, the sponsors of the three placements on the legs, and the
// front: the crest under sponsor 12, and the number with the maker's logo under it.
// The shorts' regions are in SHORTS_UV_REGIONS. What is drawn is squeezed sideways (see
// SHORTS_UV_STRETCH) because the texture has more cloth per unit across than up.
export function drawShortsToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  color: string,
  images: ShortsCompositorImages,
  nameNumberFontFamily = "sans-serif"
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  if (!design.shorts.included) return;

  drawShortsPattern(ctx, canvasSize, design.shorts);

  for (const slot of availableSponsorSlots(design)) {
    if (!isShortsSlot(slot)) continue;
    const entry = design.sponsors[slot.id];
    const image = images.sponsorImages?.[slot.id];
    if (!entry || !image) continue;

    const region = SHORTS_UV_REGIONS[slot.region as keyof typeof SHORTS_UV_REGIONS];
    const center = pointInRegionToCanvas(region, slot.uFrac, slot.vFrac, canvasSize);
    const scale = clampSponsorScale(entry.scale);
    const box = fitLogoBox(image, { x: 0, y: 0 }, canvasSize, slot.baseBox * scale, (slot.baseHeight ?? slot.baseBox) * scale);
    ctx.save();
    ctx.translate(center.x, center.y);
    // Squeezed along the canvas' x before turning, so the picture ends up undistorted on the cloth.
    ctx.scale(SHORTS_UV_STRETCH, 1);
    if (slot.rotation !== 0) ctx.rotate(slot.rotation);
    ctx.drawImage(image, box.x, box.y, box.width, box.height);
    ctx.restore();
  }

  drawFront(ctx, canvasSize, design, color, images, nameNumberFontFamily);
}

// UV -> canvas, as the shirt's compositor maps it (see UV_FLIP_Y).
const toCanvas = (u: number, v: number, size: number): [number, number] => [u * size, (UV_FLIP_Y ? 1 - v : v) * size];

// The u of the player's right leg's side seam at height v (see SHORTS_SIDE_SEAM); the left leg's is 1 - u.
function sideSeamU(v: number): number {
  const pts = SHORTS_SIDE_SEAM;
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [v0, u0] = pts[i - 1];
    const [v1, u1] = pts[i];
    if (v <= v1) return u0 + ((v - v0) / (v1 - v0)) * (u1 - u0);
  }
  return pts[pts.length - 1][1];
}

// The side stripe of one leg, from `bottom` up to `topBack` at its back edge and `topFront` at its front edge
// (a slanted top when they differ). Traced up the back edge and down the front one, bending with the seam.
function fillSideStripe(
  ctx: CanvasRenderingContext2D,
  size: number,
  leg: "right" | "left",
  bottom: number,
  topBack: number,
  topFront: number
): void {
  const w = SHORTS_SIDE_STRIPE_HALF_WIDTH;
  // The leg's front is toward higher u on the right leg and toward lower u on the left one.
  const edgeU = (v: number, toFront: number) => (leg === "right" ? sideSeamU(v) + toFront : 1 - sideSeamU(v) - toFront);
  const heights = (top: number) => [bottom, ...SHORTS_SIDE_SEAM.map(([v]) => v).filter((v) => v > bottom && v < top), top];
  const outline = [
    ...heights(topBack).map((v) => toCanvas(edgeU(v, -w), v, size)),
    ...heights(topFront).reverse().map((v) => toCanvas(edgeU(v, w), v, size)),
  ];
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// The shorts' design over their main color (see SHORTS_PATTERNS): a band round the hem, or a stripe down each
// side seam, from below the hem up through the waistband, in color 2 (its lower part in color 3, below a cut
// that rises to the back, when it is two-tone). The UV band holds both legs whole, so it goes front and back.
function drawShortsPattern(ctx: CanvasRenderingContext2D, size: number, shorts: DesignState["shorts"]): void {
  const { colors, patternId } = shorts;
  // Past the cloth at both ends, so the texture's filtering never mixes in the main color at the hem or waist.
  const BELOW = -0.05;
  const ABOVE = 1;
  if (patternId === "shorts-hem-band") {
    ctx.fillStyle = colors.secondary;
    const [, top] = toCanvas(0, SHORTS_HEM_BAND_TOP_V, size);
    ctx.fillRect(0, top, size, size - top);
    return;
  }
  if (patternId !== "shorts-side-stripe" && patternId !== "shorts-side-two-tone") return;
  ctx.fillStyle = colors.secondary;
  for (const leg of ["right", "left"] as const) fillSideStripe(ctx, size, leg, BELOW, ABOVE, ABOVE);
  if (patternId === "shorts-side-stripe") return;
  const { frontV, backV } = SHORTS_TWO_TONE_SPLIT;
  ctx.fillStyle = colors.accent;
  for (const leg of ["right", "left"] as const) fillSideStripe(ctx, size, leg, BELOW, backV, frontV);
}

// The crest, the maker's logo and the number, on the front of the shorts.
function drawFront(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  color: string,
  images: ShortsCompositorImages,
  fontFamily: string
): void {
  const place = ({ region, uFrac, vFrac }: { region: keyof typeof SHORTS_UV_REGIONS; uFrac: number; vFrac: number }) =>
    pointInRegionToCanvas(SHORTS_UV_REGIONS[region], uFrac, vFrac, canvasSize);

  if (images.logoImage) {
    const center = place(SHORTS_FRONT_LAYOUT.crest);
    // As big on the garment as the crest on the chest (see SHORTS_CREST_BOX_FRACTION).
    const box = fitLogoBox(images.logoImage, { x: 0, y: 0 }, canvasSize, SHORTS_CREST_BOX_FRACTION);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(SHORTS_CREST_STRETCH, 1);
    ctx.drawImage(images.logoImage, box.x, box.y, box.width, box.height);
    ctx.restore();
  }

  drawBrandLogoAt(
    ctx,
    canvasSize,
    { forLight: images.brandLogoForLight ?? null, forDark: images.brandLogoForDark ?? null },
    color,
    place(SHORTS_FRONT_LAYOUT.brand),
    BRAND_BOX_FRACTION,
    { squeeze: SHORTS_UV_STRETCH }
  );

  const style = design.nameNumberStyle;
  const preset = getNameNumberPreset(style.presetId);
  const panel = SHORTS_UV_REGIONS[SHORTS_FRONT_LAYOUT.number.region];
  const center = place(SHORTS_FRONT_LAYOUT.number);
  drawStyledText(ctx, displayNumber(design), center.x, center.y, {
    basePx: canvasSize * SHORTS_NUMBER_FONT_FRACTION * preset.numberScale,
    maxWidth: (panel.u1 - panel.u0) * canvasSize * 0.8,
    style,
    preset,
    fontFamily,
    squeeze: SHORTS_UV_STRETCH,
  });
}
