import type { DesignState } from "./design-state";
import { UV_FLIP_Y, type UVRegions, type UVRect } from "./uv-regions";
import {
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
  getNameNumberPreset,
  type NameNumberPreset,
  type NameNumberStyle,
} from "./name-number-presets";

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
function pointInRegionToCanvas(
  region: UVRect,
  uFrac: number,
  vFrac: number,
  canvasSize: number
): { x: number; y: number } {
  const u = region.u0 + uFrac * (region.u1 - region.u0);
  const v = region.v0 + vFrac * (region.v1 - region.v0);
  return { x: u * canvasSize, y: vToY(v) * canvasSize };
}

type LogoBox = { x: number; y: number; width: number; height: number };

// Fits a logo inside a square box of `boxFraction` of the canvas, keeping its
// aspect ratio, centered on `center`.
function fitLogoBox(
  image: HTMLImageElement,
  center: { x: number; y: number },
  canvasSize: number,
  boxFraction: number
): LogoBox {
  const boxSize = canvasSize * boxFraction;
  const { naturalWidth, naturalHeight } = image;
  const [width, height] =
    naturalWidth > 0 && naturalHeight > 0
      ? naturalWidth >= naturalHeight
        ? [boxSize, boxSize * (naturalHeight / naturalWidth)]
        : [boxSize * (naturalWidth / naturalHeight), boxSize]
      : [boxSize, boxSize];
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
function isLightUnder(ctx: CanvasRenderingContext2D, box: LogoBox, canvasSize: number, fallbackHex: string): boolean {
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

// The maker's logo: fixed, on the wearer's right chest (mirroring the crest).
// It comes in two versions and the one that contrasts with the cloth is used.
function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  images: CompositorImages,
  regions: UVRegions
): void {
  const forLight = images.brandLogoForLight ?? null;
  const forDark = images.brandLogoForDark ?? null;
  const reference = forDark ?? forLight;
  if (!reference) return;

  const center = pointInRegionToCanvas(regions.bodyFront, 1 - CREST_U_FRAC, CREST_V_FRAC, canvasSize);
  const box = fitLogoBox(reference, center, canvasSize, BRAND_BOX_FRACTION);
  const lightCloth = isLightUnder(ctx, box, canvasSize, design.colors.primary);
  const chosen = (lightCloth ? forLight ?? forDark : forDark ?? forLight)!;
  ctx.drawImage(chosen, box.x, box.y, box.width, box.height);
}

// Where the crest is centered within bodyFront: the wearer's left chest, the
// usual crest spot. Front faces +z and the camera is on +z, so u grows toward
// the viewer's right. Tuned against screenshots of the GEPE shirt: 0.70 of the
// way across and 0.71 of the way up from the hem (an earlier 0.78 / 0.635 sat
// too close to the armpit).
const CREST_U_FRAC = 0.7;
const CREST_V_FRAC = 0.71;
// The longer side of the crest, as a share of the canvas (it was 0.08, which looked too big).
const CREST_BOX_FRACTION = 0.065;
// The maker's mark is smaller than the crest, like a brand on a real shirt.
const BRAND_BOX_FRACTION = 0.03;
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

  drawBrandLogo(ctx, canvasSize, design, images, regions);

  const nnStyle = design.nameNumberStyle;
  const nnPreset = getNameNumberPreset(nnStyle.presetId);
  const backWidth = (regions.bodyBack.u1 - regions.bodyBack.u0) * canvasSize;
  const maxTextWidth = backWidth * (regions.backTextWidthFraction ?? MAX_BACK_TEXT_WIDTH_FRACTION);

  if (design.playerName) {
    // Upper portion of bodyBack: vFrac=0 is bodyBack.v0, the edge shared
    // with bodyFront's top (see logo comment above), i.e. near the collar.
    // A quarter of the way down keeps it clear of the collar, above the number.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, NAME_V_FRAC, canvasSize);
    drawBackText(ctx, design.playerName, cx, cy, {
      basePx: canvasSize * NAME_FONT_FRACTION * nnPreset.nameScale,
      maxWidth: maxTextWidth,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
    });
  }

  if (design.playerNumber) {
    // Below the name (further from the collar edge), larger font, centered
    // in bodyBack.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, 0.55, canvasSize);
    drawBackText(ctx, design.playerNumber, cx, cy, {
      basePx: canvasSize * NUMBER_FONT_FRACTION * nnPreset.numberScale,
      maxWidth: maxTextWidth,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
    });
  }
}

// The OBJ's back UV island is rotated 180deg relative to the front (measured
// on public/models/jersey_ss.obj: on the front v grows with world-y, on the
// back it shrinks; and u runs right-to-left as seen from behind). Content
// drawn upright into bodyBack would show upside-down on the model, so back
// content is drawn rotated by PI.
// Where the name's baseline sits within bodyBack, measured from the collar edge.
const NAME_V_FRAC = 0.25;
const NAME_FONT_FRACTION = 0.05;
const NUMBER_FONT_FRACTION = 0.12;
// Default share of bodyBack's width the back text may take (see UVRegions.backTextWidthFraction).
const MAX_BACK_TEXT_WIDTH_FRACTION = 0.8;

type BackTextOptions = {
  basePx: number;
  maxWidth: number;
  style: NameNumberStyle;
  preset: NameNumberPreset;
  fontFamily: string;
};

// Draws outline -> fill, centered on (x, y), rotated 180deg.
function drawBackText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { basePx, maxWidth, style, preset, fontFamily }: BackTextOptions
): void {
  ctx.save();
  const fontFor = (px: number) => `${preset.weight} ${px}px ${fontFamily}`;
  ctx.font = fontFor(basePx);
  ctx.textAlign = "center";
  const measured = ctx.measureText(text).width;
  const px = measured > maxWidth ? basePx * (maxWidth / measured) : basePx;
  ctx.font = fontFor(px);

  ctx.translate(x, y);
  ctx.rotate(Math.PI);
  ctx.lineJoin = "round";

  if (style.outline) {
    // A stroke is centered on the glyph edge and the fill covers its inner
    // half, so the line is twice the visible thickness.
    ctx.lineWidth = px * OUTLINE_WIDTH * 2;
    ctx.strokeStyle = OUTLINE_COLOR;
    ctx.strokeText(text, 0, 0);
  }

  ctx.fillStyle = style.fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

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
