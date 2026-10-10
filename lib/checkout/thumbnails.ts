import { VIEW_SETTLE_MS, captureViews, type CaptureViewsOptions } from "@/lib/builder/io/capture-views";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import type { Thumbnails } from "./order";

export { VIEW_SETTLE_MS };
export const THUMBNAIL_WIDTH = 400;
// The version handed to an AI: big enough for it to copy the design.
export const LARGE_IMAGE_WIDTH = 1024;

// A small JPEG of the WebGL canvas over the stage background, so the order
// stays light enough for sessionStorage even with a big crest or sponsors.
export function thumbnailOf(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
  width: number = THUMBNAIL_WIDTH,
  quality = 0.85
): string | null {
  if (source.width === 0 || source.height === 0) return null;
  const out = createCanvas();
  out.width = width;
  out.height = Math.max(1, Math.round((source.height * width) / source.width));
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  paintStageBackground(ctx, out.width, out.height);
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", quality);
}

type CaptureOptions = CaptureViewsOptions & {
  createCanvas?: () => HTMLCanvasElement;
};

export async function captureThumbnails({ createCanvas, ...options }: CaptureOptions): Promise<Thumbnails | null> {
  return captureViews(options, (source) => thumbnailOf(source, createCanvas));
}

// Never larger than the canvas itself: enlarging would only blur it.
export function largeImageOf(source: HTMLCanvasElement, createCanvas?: () => HTMLCanvasElement): string | null {
  return thumbnailOf(source, createCanvas, Math.min(source.width, LARGE_IMAGE_WIDTH), 0.92);
}

// Both sizes of each side in one pass, so the camera only turns once.
export async function captureDesignImages({ createCanvas, ...options }: CaptureOptions): Promise<{
  thumbnails: Thumbnails;
  images: Thumbnails;
} | null> {
  const views = await captureViews(options, (source) => {
    const small = thumbnailOf(source, createCanvas);
    const large = largeImageOf(source, createCanvas);
    return small !== null && large !== null ? { small, large } : null;
  });
  if (!views) return null;
  return {
    thumbnails: { front: views.front.small, back: views.back.small },
    images: { front: views.front.large, back: views.back.large },
  };
}
