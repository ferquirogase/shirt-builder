import { recolorSvg, type ColorMap } from "./svg-recolor";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadPatternImage(svgPath: string, colors: ColorMap): Promise<HTMLImageElement> {
  const response = await fetch(svgPath);
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
