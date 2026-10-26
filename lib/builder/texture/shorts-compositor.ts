import {
  SHORTS_FRONT_LAYOUT,
  SHORTS_NUMBER_FONT_FRACTION,
  SHORTS_UV_REGIONS,
  SHORTS_UV_STRETCH,
} from "../geometry/shorts-uv-regions";
import { getNameNumberPreset } from "../catalog/name-number-presets";
import { availableSponsorSlots, clampSponsorScale, isShortsSlot, type SponsorSlotId } from "../catalog/sponsor-slots";
import type { DesignState } from "../state/design-state";
import { BRAND_BOX_FRACTION, CREST_BOX_FRACTION, drawBrandLogoAt, fitLogoBox, pointInRegionToCanvas } from "./texture-compositor";
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
    // The same size as the crest on the chest, squeezed like everything on the shorts.
    const box = fitLogoBox(images.logoImage, { x: 0, y: 0 }, canvasSize, CREST_BOX_FRACTION);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(SHORTS_UV_STRETCH, 1);
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
