import { VIEW_SETTLE_MS, captureViews, type CaptureViewsOptions } from "@/lib/builder/io/capture-views";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import type { Thumbnails } from "./order";

export { VIEW_SETTLE_MS };
export const THUMBNAIL_WIDTH = 400;

// A small JPEG of the WebGL canvas over the stage background, so the order
// stays light enough for sessionStorage even with a big crest or sponsors.
export function thumbnailOf(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): string | null {
  if (source.width === 0 || source.height === 0) return null;
  const out = createCanvas();
  out.width = THUMBNAIL_WIDTH;
  out.height = Math.max(1, Math.round((source.height * THUMBNAIL_WIDTH) / source.width));
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  paintStageBackground(ctx, out.width, out.height);
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.85);
}

type CaptureOptions = CaptureViewsOptions & {
  createCanvas?: () => HTMLCanvasElement;
};

export async function captureThumbnails({ createCanvas, ...options }: CaptureOptions): Promise<Thumbnails | null> {
  return captureViews(options, (source) => thumbnailOf(source, createCanvas));
}
