import type { ViewSide } from "@/lib/builder/geometry/camera-math";

// How long the camera needs to finish turning before we read the canvas. The
// rig eases 12% of the remaining angle per frame (~60 frames for a half turn).
export const VIEW_SETTLE_MS = 1300;

export type CaptureViewsOptions = {
  canvas: HTMLCanvasElement;
  // Asks the viewer to turn to a side (from the default pose).
  showView: (side: ViewSide) => void;
  wait: (ms: number) => Promise<void>;
  // Aborting stops the sequence: the camera is not turned any further and the
  // canvas is not read, so a newer capture is not disturbed.
  signal?: AbortSignal;
};

// Turns the viewer to the front and then to the back, reading the canvas with
// `grab` once the camera has settled on each side. Null if either read fails
// or the capture was cancelled.
export async function captureViews<T>(
  { canvas, showView, wait, signal }: CaptureViewsOptions,
  grab: (source: HTMLCanvasElement) => T | null
): Promise<{ front: T; back: T } | null> {
  if (signal?.aborted) return null;
  showView("front");
  await wait(VIEW_SETTLE_MS);
  if (signal?.aborted) return null;
  const front = grab(canvas);

  showView("back");
  await wait(VIEW_SETTLE_MS);
  if (signal?.aborted) return null;
  const back = grab(canvas);

  return front !== null && back !== null ? { front, back } : null;
}
