import { SHORTS_UV_REGIONS, SHORTS_UV_STRETCH } from "../geometry/shorts-uv-regions";
import { availableSponsorSlots, clampSponsorScale, isShortsSlot, type SponsorSlotId } from "../catalog/sponsor-slots";
import type { DesignState } from "../state/design-state";
import { fitLogoBox, pointInRegionToCanvas } from "./texture-compositor";

export type ShortsCompositorImages = {
  /** Decoded sponsor images, by placement; a missing or null one is not drawn. */
  sponsorImages?: Partial<Record<SponsorSlotId, HTMLImageElement | null>>;
};

// Paints the shorts' texture: their color, and the sponsors of the three placements on the legs.
// The shorts' regions are in SHORTS_UV_REGIONS. What is drawn is squeezed sideways (see
// SHORTS_UV_STRETCH) because the texture has more cloth per unit across than up.
export function drawShortsToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  color: string,
  images: ShortsCompositorImages
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

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
}
