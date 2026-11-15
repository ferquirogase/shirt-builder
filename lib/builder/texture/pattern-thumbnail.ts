import { recolorSvg, type ColorMap } from "./svg-recolor";
import { loadMaskPiece } from "./image-loader";

const markupCache = new Map<string, Promise<string>>();

export function fetchPatternMarkup(svgPath: string): Promise<string> {
  let pending = markupCache.get(svgPath);
  if (!pending) {
    pending = fetch(svgPath).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch pattern: ${svgPath} (${response.status})`);
      }
      return response.text();
    });
    // A failed fetch must not poison the cache.
    pending.catch(() => markupCache.delete(svgPath));
    markupCache.set(svgPath, pending);
  }
  return pending;
}

export function svgToDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** The thumbnail image (SVG, or a color mask PNG) in the given colors, as a URL for CSS. */
export async function patternThumbnailUrl(path: string, colors: ColorMap): Promise<string> {
  if (path.endsWith(".png")) return (await loadMaskPiece(path, colors)).toDataURL();
  return svgToDataUrl(recolorSvg(await fetchPatternMarkup(path), colors));
}

export function clearPatternMarkupCache(): void {
  markupCache.clear();
}
