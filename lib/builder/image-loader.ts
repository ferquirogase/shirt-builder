import { recolorSvg, type ColorMap } from "./svg-recolor";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function loadPatternImage(svgPath: string, colors: ColorMap): Promise<HTMLImageElement> {
  const response = await fetch(svgPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch pattern: ${svgPath} (${response.status})`);
  }
  const svgMarkup = await response.text();
  const recolored = recolorSvg(svgMarkup, colors);
  const blob = new Blob([recolored], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
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
