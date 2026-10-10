import { contentBounds } from "./geometry";

// A full-size copy of the WebGL canvas (kept transparent) cropped to the pixels
// that show the shirt, so every shirt fills its box the same way whatever the
// screen size. The copy is made right away because the WebGL buffer changes as
// soon as the camera moves on.
export function shirtImageOf(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): HTMLCanvasElement | null {
  if (source.width === 0 || source.height === 0) return null;

  const copy = createCanvas();
  copy.width = source.width;
  copy.height = source.height;
  const copyCtx = copy.getContext("2d");
  if (!copyCtx) return null;
  copyCtx.drawImage(source, 0, 0);

  const { data } = copyCtx.getImageData(0, 0, copy.width, copy.height);
  const bounds = contentBounds(data, copy.width, copy.height);
  if (!bounds) return null;

  const out = createCanvas();
  out.width = bounds.w;
  out.height = bounds.h;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  outCtx.drawImage(copy, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
  return out;
}
