import { recolorSvg, type ColorMap } from "./svg-recolor";
import { recolorMaskPixels } from "./mask-recolor";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

const isMask = (path: string) => path.endsWith(".png");

async function loadSvgPiece(svgPath: string, colors: ColorMap): Promise<HTMLImageElement> {
  const response = await fetch(svgPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch pattern: ${svgPath} (${response.status})`);
  }
  const recolored = recolorSvg(await response.text(), colors);
  const url = URL.createObjectURL(new Blob([recolored], { type: "image/svg+xml" }));
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The decoded masks, by path: a color change repaints them without downloading them again.
const maskCache = new Map<string, Promise<HTMLImageElement>>();

function loadMask(path: string): Promise<HTMLImageElement> {
  let pending = maskCache.get(path);
  if (!pending) {
    pending = loadImage(path);
    pending.catch(() => maskCache.delete(path));
    maskCache.set(path, pending);
  }
  return pending;
}

/** A color mask PNG painted in the user's colors (see mask-recolor.ts). */
export async function loadMaskPiece(path: string, colors: ColorMap): Promise<HTMLCanvasElement> {
  const mask = await loadMask(path);
  const canvas = document.createElement("canvas");
  canvas.width = mask.naturalWidth;
  canvas.height = mask.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`No 2d context to paint mask: ${path}`);
  ctx.drawImage(mask, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorMaskPixels(pixels.data, colors);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

/** One piece of a pattern (front, back or sleeve), SVG or color mask, in the user's colors. */
export function loadPatternImage(path: string, colors: ColorMap): Promise<CanvasImageSource> {
  return isMask(path) ? loadMaskPiece(path, colors) : loadSvgPiece(path, colors);
}

const SLEEVE_SIZE = 512;

/** The part of a sleeve image (`size` square, cap -> cuff along x) that the cuff band takes. */
export function cuffRect(cuffFrom: number, size: number): { x: number; y: number; width: number; height: number } {
  const x = Math.round(cuffFrom * size);
  return { x, y: 0, width: size - x, height: size };
}

/** The sleeve in the torso's colors, with its cuff band (when it has one) in the cuff color. */
export async function loadSleeveImage(path: string, cuffFrom: number | null, colors: ColorMap): Promise<CanvasImageSource> {
  const piece = await loadPatternImage(path, colors);
  if (cuffFrom === null || !colors.sleeveTrim) return piece;
  const canvas = document.createElement("canvas");
  canvas.width = SLEEVE_SIZE;
  canvas.height = SLEEVE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`No 2d context to draw sleeve: ${path}`);
  ctx.drawImage(piece, 0, 0, SLEEVE_SIZE, SLEEVE_SIZE);
  const { x, y, width, height } = cuffRect(cuffFrom, SLEEVE_SIZE);
  ctx.fillStyle = colors.sleeveTrim;
  ctx.fillRect(x, y, width, height);
  return canvas;
}

// Loads an atlas-sized mask whose opaque pixels mark an area, and returns a
// copy of it where those pixels are painted `color` (transparent elsewhere).
export async function loadTintedMask(src: string, color: string): Promise<HTMLCanvasElement> {
  const mask = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = mask.naturalWidth;
  canvas.height = mask.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`No 2d context to tint mask: ${src}`);
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
