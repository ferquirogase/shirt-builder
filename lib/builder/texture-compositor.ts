import type { DesignState } from "./design-state";
import { UV_FLIP_Y, type UVRegions, type UVRect } from "./uv-regions";

export type CompositorImages = {
  bodyPatternImage: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
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

export function drawDesignToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  images: CompositorImages,
  regions: UVRegions
): void {
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = design.colors.primary;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  if (images.bodyPatternImage) {
    drawImageInRegion(ctx, images.bodyPatternImage, regions.bodyFront, canvasSize);
    drawImageInRegion(ctx, images.bodyPatternImage, regions.bodyBack, canvasSize, "rotate180");
  }

  if (images.sleevePatternImage) {
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveLeft, canvasSize);
    // The sleeveRight island is the mirror image of sleeveLeft (see uv-regions.ts),
    // so direction-sensitive sleeve patterns must be mirrored to match.
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveRight, canvasSize, "mirrorX");
  }

  if (images.logoImage) {
    // bodyFront.v1 (0.5) and bodyBack.v0 (0.5) are the same UV value: the
    // two regions share that boundary, which is the shoulder/collar seam
    // where the front and back panels meet at the top of the garment.
    // Moving away from that shared line (toward bodyFront.v0 / bodyBack.v1)
    // goes down the torso toward the hem. So "top of bodyFront" in UV space
    // is vFrac=1 (its v1 edge, the one shared with bodyBack).
    // Preserve the source image's aspect ratio by fitting within a
    // bounding box rather than forcing a square.
    const boxSize = canvasSize * 0.08;
    const { naturalWidth, naturalHeight } = images.logoImage;
    const [logoWidth, logoHeight] =
      naturalWidth > 0 && naturalHeight > 0
        ? naturalWidth >= naturalHeight
          ? [boxSize, boxSize * (naturalHeight / naturalWidth)]
          : [boxSize * (naturalWidth / naturalHeight), boxSize]
        : [boxSize, boxSize];

    const anchor = pointInRegionToCanvas(regions.bodyFront, 0, 1, canvasSize);
    const logoX = anchor.x + canvasSize * 0.02;
    const logoY = anchor.y + canvasSize * 0.02;
    ctx.drawImage(images.logoImage, logoX, logoY, logoWidth, logoHeight);
  }

  if (design.sponsorText) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `${canvasSize * 0.03}px sans-serif`;
    ctx.textAlign = "center";
    // Near the top of bodyFront, below the logo.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyFront, 0.5, 0.85, canvasSize);
    ctx.fillText(design.sponsorText, cx, cy);
  }

  if (design.playerName) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${canvasSize * 0.05}px sans-serif`;
    ctx.textAlign = "center";
    // Upper portion of bodyBack: vFrac=0 is bodyBack.v0, the edge shared
    // with bodyFront's top (see logo comment above), i.e. near the collar.
    // A small offset from 0 keeps it just below the collar, above the number.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, 0.15, canvasSize);
    fillTextRotated180(ctx, design.playerName, cx, cy);
  }

  if (design.playerNumber) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${canvasSize * 0.12}px sans-serif`;
    ctx.textAlign = "center";
    // Below the name (further from the collar edge), larger font, centered
    // in bodyBack.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, 0.55, canvasSize);
    fillTextRotated180(ctx, design.playerNumber, cx, cy);
  }
}

// The OBJ's back UV island is rotated 180deg relative to the front (measured
// on public/models/jersey_ss.obj: on the front v grows with world-y, on the
// back it shrinks; and u runs right-to-left as seen from behind). Content
// drawn upright into bodyBack would show upside-down on the model, so back
// content is drawn rotated by PI.
function fillTextRotated180(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI);
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
