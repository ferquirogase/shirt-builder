import type { ViewSide } from "@/lib/builder/geometry/camera-math";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import type { Thumbnails } from "./order";

export const THUMBNAIL_WIDTH = 400;
// How long the camera needs to finish turning before we read the canvas. The
// rig eases 12% of the remaining angle per frame (~60 frames for a half turn).
export const VIEW_SETTLE_MS = 1300;

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

type CaptureOptions = {
  canvas: HTMLCanvasElement;
  // Asks the viewer to turn to a side (from the default pose).
  showView: (side: ViewSide) => void;
  wait: (ms: number) => Promise<void>;
  createCanvas?: () => HTMLCanvasElement;
};

export async function captureThumbnails({
  canvas,
  showView,
  wait,
  createCanvas,
}: CaptureOptions): Promise<Thumbnails | null> {
  showView("front");
  await wait(VIEW_SETTLE_MS);
  const front = thumbnailOf(canvas, createCanvas);

  showView("back");
  await wait(VIEW_SETTLE_MS);
  const back = thumbnailOf(canvas, createCanvas);

  return front && back ? { front, back } : null;
}
