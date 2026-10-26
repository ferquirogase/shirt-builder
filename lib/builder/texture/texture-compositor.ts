import type { DesignState } from "../state/design-state";
import { UV_FLIP_Y, type UVRegions, type UVRect } from "../geometry/uv-regions";
import { displayName, displayNumber, drawStyledText, showsNamePlaceholder } from "./number-text";
import { NAME_FONT_FRACTION, NAME_V_FRAC, NAPE_V_FRAC, NUMBER_FONT_FRACTION, NUMBER_V_FRAC } from "./back-layout";
import {
  availableSponsorSlots,
  clampSponsorScale,
  findSponsorSlot,
  isShortsSlot,
  type SponsorSlotId,
} from "../catalog/sponsor-slots";
import { CHEST_NUMBER_FONT_FRACTION, CHEST_NUMBER_MAX_WIDTH_FRACTION } from "./front-layout";
import { getNameNumberPreset } from "../catalog/name-number-presets";

export type CompositorImages = {
  bodyPatternImage: HTMLImageElement | null;
  /** Optional dedicated back panel; the front image is used when this is null/absent. */
  bodyBackPatternImage?: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
  /**
   * Full-atlas image, already tinted, painted over the patterns. Marks the
   * parts of the atlas that carry the collar colour (see jersey-model.ts).
   */
  collarMaskImage?: CanvasImageSource | null;
  /** The brand logo for light backgrounds (dark artwork) and for dark ones (light artwork). */
  brandLogoForLight?: HTMLImageElement | null;
  brandLogoForDark?: HTMLImageElement | null;
  /** Decoded sponsor images, by placement; a missing or null one is not drawn. */
  sponsorImages?: Partial<Record<SponsorSlotId, HTMLImageElement | null>>;
};

// UV v -> canvas y fraction. CanvasTexture (and this app's JerseyModel) uses
// flipY = UV_FLIP_Y, meaning v=0 samples the BOTTOM row of the canvas and
// v=1 the TOP row when the flip is on. This is the single place that maps
// UV-space v to canvas-space y; every position calculation below must route
// through this (directly or via rectToCanvas) so UV_FLIP_Y stays the one
// source of truth.
function vToY(v: number): number {
  return UV_FLIP_Y ? 1 - v : v;
}

type CanvasRect = { x: number; y: number; width: number; height: number };

// Converts a UV-space rect into canvas pixel coordinates, accounting for the
// v-flip. u maps directly to x (never flipped); v is passed through vToY,
// and since flipping can swap which edge is "top", we take min/max after
// conversion rather than assuming v0 < v1 in canvas space.
function rectToCanvas(rect: UVRect, canvasSize: number): CanvasRect {
  const yA = vToY(rect.v0) * canvasSize;
  const yB = vToY(rect.v1) * canvasSize;
  const yTop = Math.min(yA, yB);
  const yBottom = Math.max(yA, yB);
  return {
    x: rect.u0 * canvasSize,
    y: yTop,
    width: (rect.u1 - rect.u0) * canvasSize,
    height: yBottom - yTop,
  };
}

// Converts a point given in UV-space fractions (uFrac, vFrac measured
// *within* a region, i.e. both in [0,1] relative to the region's own
// bounds) into absolute canvas pixel coordinates, applying the same flip.
export function pointInRegionToCanvas(
  region: UVRect,
  uFrac: number,
  vFrac: number,
  canvasSize: number
): { x: number; y: number } {
  const u = region.u0 + uFrac * (region.u1 - region.u0);
  const v = region.v0 + vFrac * (region.v1 - region.v0);
  return { x: u * canvasSize, y: vToY(v) * canvasSize };
}

// The regions of the shirt: the shorts have their own texture and their own regions.
type ShirtRegionName = "bodyFront" | "bodyBack" | "sleeveLeft" | "sleeveRight";

type LogoBox = { x: number; y: number; width: number; height: number };

// Fits a logo inside a box of `boxFraction` x `heightFraction` of the canvas (square when
// the height is not given), keeping its aspect ratio, centered on `center`. The logo is as big
// as the box lets it be: a wide banner is limited by the width, a tall one by the height.
export function fitLogoBox(
  image: HTMLImageElement,
  center: { x: number; y: number },
  canvasSize: number,
  boxFraction: number,
  heightFraction = boxFraction
): LogoBox {
  const boxWidth = canvasSize * boxFraction;
  const boxHeight = canvasSize * heightFraction;
  const { naturalWidth, naturalHeight } = image;
  let width = Math.min(boxWidth, boxHeight);
  let height = width;
  if (naturalWidth > 0 && naturalHeight > 0) {
    const fit = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
    width = naturalWidth * fit;
    height = naturalHeight * fit;
  }
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

// Perceived brightness, 0 (black) to 1 (white).
function luma(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function hexLuma(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return 0;
  return luma(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16));
}

// Is the cloth under `box` light? Reads the pixels already painted there, so a
// pattern (e.g. a white stripe on a green shirt) is judged where the logo
// really sits. If the pixels can't be read, the primary color stands in.
export function isLightUnder(ctx: CanvasRenderingContext2D, box: LogoBox, canvasSize: number, fallbackHex: string): boolean {
  if (typeof ctx.getImageData === "function") {
    try {
      const x = Math.max(0, Math.floor(box.x));
      const y = Math.max(0, Math.floor(box.y));
      const w = Math.max(1, Math.min(canvasSize - x, Math.ceil(box.width)));
      const h = Math.max(1, Math.min(canvasSize - y, Math.ceil(box.height)));
      const { data } = ctx.getImageData(x, y, w, h);
      let sum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += luma(data[i], data[i + 1], data[i + 2]);
        count++;
      }
      if (count > 0) return sum / count >= LIGHT_BACKGROUND_LUMA;
    } catch {
      // A tainted canvas refuses to be read: use the primary color below.
    }
  }
  return hexLuma(fallbackHex) >= LIGHT_BACKGROUND_LUMA;
}

export type BrandLogos = { forLight: HTMLImageElement | null; forDark: HTMLImageElement | null };

// Draws the maker's logo centered on `center`, in the version that contrasts with the cloth under it
// (the pixels already painted there, or `fallbackHex` when they can't be read). `rotation` turns it
// about its center, `squeeze` narrows it sideways first (the shorts' texture, see SHORTS_UV_STRETCH) and
// `squeezeY` makes it shorter (cloth that is stretched upwards, as at the nape).
export function drawBrandLogoAt(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  logos: BrandLogos,
  fallbackHex: string,
  center: { x: number; y: number },
  boxFraction: number,
  { rotation = 0, squeeze = 1, squeezeY = 1 }: { rotation?: number; squeeze?: number; squeezeY?: number } = {}
): void {
  const { forLight, forDark } = logos;
  const reference = forDark ?? forLight;
  if (!reference) return;

  const box = fitLogoBox(reference, center, canvasSize, boxFraction);
  // The cloth is judged where the logo really sits: its box is centered on `center` whatever the
  // turn, and narrower once squeezed.
  const seen = {
    x: center.x - (box.width * squeeze) / 2,
    y: center.y - (box.height * squeezeY) / 2,
    width: box.width * squeeze,
    height: box.height * squeezeY,
  };
  const lightCloth = isLightUnder(ctx, seen, canvasSize, fallbackHex);
  const chosen = (lightCloth ? forLight ?? forDark : forDark ?? forLight)!;
  if (rotation === 0 && squeeze === 1 && squeezeY === 1) {
    ctx.drawImage(chosen, box.x, box.y, box.width, box.height);
    return;
  }
  const upright = fitLogoBox(reference, { x: 0, y: 0 }, canvasSize, boxFraction);
  ctx.save();
  ctx.translate(center.x, center.y);
  if (squeeze !== 1 || squeezeY !== 1) ctx.scale(squeeze, squeezeY);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.drawImage(chosen, upright.x, upright.y, upright.width, upright.height);
  ctx.restore();
}

// The maker's logo, in two places: the wearer's right chest (mirroring the crest) and the
// back of the neck, which is reserved for it. It comes in two versions and, at each place,
// the one that contrasts with the cloth under it is used.
function drawBrandLogos(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  images: CompositorImages,
  regions: UVRegions
): void {
  const logos = { forLight: images.brandLogoForLight ?? null, forDark: images.brandLogoForDark ?? null };
  const primary = design.colors.primary;
  const chest = pointInRegionToCanvas(regions.bodyFront, BRAND_U_FRAC, CREST_V_FRAC, canvasSize);
  drawBrandLogoAt(ctx, canvasSize, logos, primary, chest, BRAND_BOX_FRACTION);
  // Turned like the rest of the back, so it reads upright on the model.
  const nape = pointInRegionToCanvas(regions.bodyBack, 0.5, NAPE_V_FRAC, canvasSize);
  drawBrandLogoAt(ctx, canvasSize, logos, primary, nape, NAPE_BRAND_BOX_FRACTION, {
    rotation: Math.PI,
    squeezeY: NAPE_BRAND_SQUEEZE_Y,
  });
}

// The sponsors: one image per placement. Each is fitted into its box (placement
// base size x the user's scale), centered on the placement's point and turned so
// it reads upright on the model.
function drawSponsors(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  images: CompositorImages,
  regions: UVRegions
): void {
  // Only the placements offered: a sponsor kept on one that something else took over is not drawn.
  for (const slot of availableSponsorSlots(design)) {
    // The shorts' placements are painted on the shorts' own texture.
    if (isShortsSlot(slot)) continue;
    const entry = design.sponsors[slot.id];
    const image = images.sponsorImages?.[slot.id];
    if (!entry || !image) continue;

    const center = pointInRegionToCanvas(regions[slot.region as ShirtRegionName], slot.uFrac, slot.vFrac, canvasSize);
    const scale = clampSponsorScale(entry.scale);
    const box = fitLogoBox(image, { x: 0, y: 0 }, canvasSize, slot.baseBox * scale, (slot.baseHeight ?? slot.baseBox) * scale);
    ctx.save();
    ctx.translate(center.x, center.y);
    if (slot.rotation !== 0) ctx.rotate(slot.rotation);
    ctx.drawImage(image, box.x, box.y, box.width, box.height);
    ctx.restore();
  }
}

// Where the crest is centered within bodyFront: the wearer's left chest, the
// usual crest spot. Front faces +z and the camera is on +z, so u grows toward
// the viewer's right. Tuned against screenshots of the GEPE shirt: 0.66 of the
// way across and 0.71 of the way up from the hem. It was 0.70, but the edge
// nearest the sleeve got distorted where the cloth curves; an earlier 0.78 / 0.635
// sat too close to the armpit.
const CREST_U_FRAC = 0.66;
// The maker's mark sits on the other chest, where the crest used to be mirrored.
const BRAND_U_FRAC = 0.3;
const CREST_V_FRAC = 0.71;
// The longer side of the crest, as a share of the canvas (it was 0.08, then 0.065 and 0.058, which still
// reached the curve of the sleeve).
export const CREST_BOX_FRACTION = 0.052;
// The maker's mark is smaller than the crest, like a brand on a real shirt.
export const BRAND_BOX_FRACTION = 0.03;
// At the nape it is smaller still: it is a tag, not a brand mark.
export const NAPE_BRAND_BOX_FRACTION = 0.022;
// The collar has more cloth up the neck than across it (about 1.37 times at the nape), which would
// stretch the logo upwards: it is drawn this much shorter so it looks as it should (a test measures it).
export const NAPE_BRAND_SQUEEZE_Y = 0.74;
// Cloth at least this bright (0..1) gets the logo version meant for light backgrounds.
const LIGHT_BACKGROUND_LUMA = 0.5;

export function drawDesignToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  images: CompositorImages,
  regions: UVRegions,
  nameNumberFontFamily = "sans-serif"
): void {
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = design.colors.primary;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  if (images.bodyPatternImage) {
    drawImageInRegion(ctx, images.bodyPatternImage, regions.bodyFront, canvasSize);
    drawImageInRegion(
      ctx,
      images.bodyBackPatternImage ?? images.bodyPatternImage,
      regions.bodyBack,
      canvasSize,
      "rotate180"
    );
  }

  if (images.sleevePatternImage) {
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveLeft, canvasSize);
    // The sleeveRight island is the mirror image of sleeveLeft (see uv-regions.ts),
    // so direction-sensitive sleeve patterns must be mirrored to match.
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveRight, canvasSize, "mirrorX");
  }

  if (images.collarMaskImage) {
    ctx.drawImage(images.collarMaskImage, 0, 0, canvasSize, canvasSize);
  }

  if (images.logoImage) {
    // bodyFront.v1 (0.5) and bodyBack.v0 (0.5) are the same UV value: the
    // two regions share that boundary, which is the shoulder/collar seam
    // where the front and back panels meet at the top of the garment.
    // Moving away from that shared line (toward bodyFront.v0 / bodyBack.v1)
    // goes down the torso toward the hem. So "top of bodyFront" in UV space
    // is vFrac=1 (its v1 edge, the one shared with bodyBack).
    const center = pointInRegionToCanvas(regions.bodyFront, CREST_U_FRAC, CREST_V_FRAC, canvasSize);
    const box = fitLogoBox(images.logoImage, center, canvasSize, CREST_BOX_FRACTION);
    ctx.drawImage(images.logoImage, box.x, box.y, box.width, box.height);
  }

  drawBrandLogos(ctx, canvasSize, design, images, regions);
  drawSponsors(ctx, canvasSize, design, images, regions);

  const nnStyle = design.nameNumberStyle;
  const nnPreset = getNameNumberPreset(nnStyle.presetId);
  const backWidth = (regions.bodyBack.u1 - regions.bodyBack.u0) * canvasSize;
  const maxTextWidth = backWidth * (regions.backTextWidthFraction ?? MAX_BACK_TEXT_WIDTH_FRACTION);

  if (design.chestNumber) {
    // The number goes where sponsor 1 would be, upright (the back's is turned). Its point is the
    // middle of the digits, and the text rests on its baseline, so it is lowered by half their height.
    const slot = findSponsorSlot("abdomen")!;
    const center = pointInRegionToCanvas(regions.bodyFront, slot.uFrac, slot.vFrac, canvasSize);
    const basePx = canvasSize * CHEST_NUMBER_FONT_FRACTION * nnPreset.numberScale;
    const frontWidth = (regions.bodyFront.u1 - regions.bodyFront.u0) * canvasSize;
    drawStyledText(ctx, displayNumber(design), center.x, center.y + basePx * DIGIT_HALF_HEIGHT, {
      basePx,
      maxWidth: frontWidth * CHEST_NUMBER_MAX_WIDTH_FRACTION,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
    });
  }

  // The typed name or, while there is none and the upper back is free, an example of one.
  if (design.playerName.trim() !== "" || showsNamePlaceholder(design)) {
    // Upper portion of bodyBack: vFrac=0 is bodyBack.v0, the edge shared
    // with bodyFront's top (see logo comment above), i.e. near the collar.
    // Below the collar band and the maker's logo at the nape, above the number (see back-layout.ts).
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, NAME_V_FRAC, canvasSize);
    drawStyledText(ctx, displayName(design), cx, cy, {
      basePx: canvasSize * NAME_FONT_FRACTION * nnPreset.nameScale,
      maxWidth: maxTextWidth,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
      rotation: Math.PI,
    });
  }

  {
    // Below the name (further from the collar edge), larger font, centered
    // in bodyBack.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, NUMBER_V_FRAC, canvasSize);
    drawStyledText(ctx, displayNumber(design), cx, cy, {
      basePx: canvasSize * NUMBER_FONT_FRACTION * nnPreset.numberScale,
      maxWidth: maxTextWidth,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
      rotation: Math.PI,
    });
  }
}

// The OBJ's back UV island is rotated 180deg relative to the front (measured
// on public/models/gepe_shirt.obj: on the front v grows with world-y, on the
// back it shrinks; and u runs right-to-left as seen from behind). Content
// drawn upright into bodyBack would show upside-down on the model, so back
// content is drawn rotated by PI.
// The digits are about 0.72 of the font size tall: half of that, to center them on a point.
const DIGIT_HALF_HEIGHT = 0.36;
// Default share of bodyBack's width the back text may take (see UVRegions.backTextWidthFraction).
const MAX_BACK_TEXT_WIDTH_FRACTION = 0.8;

type RegionOrientation = "plain" | "rotate180" | "mirrorX";

function drawImageInRegion(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  region: UVRect,
  canvasSize: number,
  orientation: RegionOrientation = "plain"
): void {
  const { x, y, width, height } = rectToCanvas(region, canvasSize);
  if (orientation === "plain") {
    ctx.drawImage(image, x, y, width, height);
    return;
  }
  // Rotating or mirroring a rect about its own center maps it onto itself.
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  if (orientation === "rotate180") ctx.rotate(Math.PI);
  else ctx.scale(-1, 1);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}
