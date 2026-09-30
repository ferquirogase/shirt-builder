import type { DesignState } from "./design-state";
import type { UVRegions, UVRect } from "./uv-regions";

export type CompositorImages = {
  bodyPatternImage: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
};

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
    drawImageInRegion(ctx, images.bodyPatternImage, regions.bodyBack, canvasSize);
  }

  if (images.sleevePatternImage) {
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveLeft, canvasSize);
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveRight, canvasSize);
  }

  if (images.logoImage) {
    const logoSize = canvasSize * 0.08;
    const logoX = regions.bodyFront.u0 * canvasSize + canvasSize * 0.02;
    const logoY = regions.bodyFront.v0 * canvasSize + canvasSize * 0.02;
    ctx.drawImage(images.logoImage, logoX, logoY, logoSize, logoSize);
  }

  if (design.sponsorText) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `${canvasSize * 0.03}px sans-serif`;
    ctx.textAlign = "center";
    const cx = ((regions.bodyFront.u0 + regions.bodyFront.u1) / 2) * canvasSize;
    const cy = (regions.bodyFront.v0 + 0.15) * canvasSize;
    ctx.fillText(design.sponsorText, cx, cy);
  }

  if (design.playerName) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${canvasSize * 0.05}px sans-serif`;
    ctx.textAlign = "center";
    const cx = ((regions.bodyBack.u0 + regions.bodyBack.u1) / 2) * canvasSize;
    const cy = (regions.bodyBack.v0 + 0.1) * canvasSize;
    ctx.fillText(design.playerName, cx, cy);
  }

  if (design.playerNumber) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${canvasSize * 0.12}px sans-serif`;
    ctx.textAlign = "center";
    const cx = ((regions.bodyBack.u0 + regions.bodyBack.u1) / 2) * canvasSize;
    const cy = (regions.bodyBack.v0 + 0.4) * canvasSize;
    ctx.fillText(design.playerNumber, cx, cy);
  }
}

function drawImageInRegion(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  region: UVRect,
  canvasSize: number
): void {
  const x = region.u0 * canvasSize;
  const y = region.v0 * canvasSize;
  const width = (region.u1 - region.u0) * canvasSize;
  const height = (region.v1 - region.v0) * canvasSize;
  ctx.drawImage(image, x, y, width, height);
}
