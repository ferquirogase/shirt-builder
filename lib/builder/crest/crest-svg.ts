import { CREST_SHAPES, findCrestShape, type CrestShape } from "../catalog/crest-shapes";
import { findCrestSymbol } from "../catalog/crest-symbols";
import { contrastColor } from "../color/contrast";
import type { CrestConfig, CrestDivisionId } from "./crest-config";

const VIEW = 100;
const MARGIN = 4;
// Visible width of the border, in view units.
const BORDER = 3.2;
const RENDER_SIZE = 512;

const num = (value: number) => Number(value.toFixed(3));

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function divisionMarkup(id: CrestDivisionId, box: CrestShape["box"], fill: string): string {
  const { x, y, width: w, height: h } = box;
  switch (id) {
    case "half":
      return `<rect x="${num(x + w / 2)}" y="${num(y)}" width="${num(w / 2)}" height="${num(h)}" fill="${fill}"/>`;
    case "stripes":
      return [1, 3]
        .map((i) => `<rect x="${num(x + (w / 5) * i)}" y="${num(y)}" width="${num(w / 5)}" height="${num(h)}" fill="${fill}"/>`)
        .join("");
    case "band": {
      const points = [
        [x, y + h * 0.1],
        [x, y + h * 0.4],
        [x + w, y + h * 0.9],
        [x + w, y + h * 0.6],
      ];
      return `<polygon points="${points.map(([px, py]) => `${num(px)},${num(py)}`).join(" ")}" fill="${fill}"/>`;
    }
    default:
      return "";
  }
}

// Fill is black or white, whichever reads on the primary color, with the opposite as an outline
// so it also reads over the secondary color.
function symbolMarkup(config: CrestConfig, box: CrestShape["box"]): string {
  const { symbol } = config;
  if (!symbol) return "";
  const fill = contrastColor(config.colors.primary);
  const outline = contrastColor(fill);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.46;
  const side = Math.min(box.width, box.height);

  if (symbol.kind === "icon") {
    const def = findCrestSymbol(symbol.id);
    if (!def) return "";
    const size = side * 0.42;
    return (
      `<g transform="translate(${num(cx - size / 2)} ${num(cy - size / 2)}) scale(${num(size / 24)})">` +
      `<path d="${def.d}" fill="${fill}" fill-rule="evenodd" stroke="${outline}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/></g>`
    );
  }

  if (symbol.text === "") return "";
  const fontSize = side * ([0.5, 0.5, 0.38, 0.3][Math.min(symbol.text.length, 3)] ?? 0.3);
  return (
    `<text x="${num(cx)}" y="${num(cy)}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${num(fontSize)}" ` +
    `fill="${fill}" stroke="${outline}" stroke-width="${num(fontSize * 0.08)}" stroke-linejoin="round" paint-order="stroke">` +
    `${escapeXml(symbol.text)}</text>`
  );
}

export function crestToSvg(config: CrestConfig): string {
  const shape = findCrestShape(config.shapeId) ?? CREST_SHAPES[0];
  const { box, d } = shape;
  const { primary, secondary } = config.colors;
  const scale = (VIEW - 2 * MARGIN) / Math.max(box.width, box.height);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // The stroke is centered on the edge and clipped to the shape, so only its inner half shows.
  const border = (BORDER / scale) * 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER_SIZE}" height="${RENDER_SIZE}" viewBox="0 0 ${VIEW} ${VIEW}">` +
    `<g transform="translate(${VIEW / 2} ${VIEW / 2}) scale(${num(scale)}) translate(${num(-cx)} ${num(-cy)})">` +
    `<defs><clipPath id="crest-clip"><path d="${d}"/></clipPath></defs>` +
    `<path d="${d}" fill="${primary}"/>` +
    `<g clip-path="url(#crest-clip)">${divisionMarkup(config.divisionId, box, secondary)}` +
    `<path d="${d}" fill="none" stroke="${secondary}" stroke-width="${num(border)}"/></g>` +
    symbolMarkup(config, box) +
    `</g></svg>`
  );
}

export function crestDataUrl(config: CrestConfig): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(crestToSvg(config))}`;
}
