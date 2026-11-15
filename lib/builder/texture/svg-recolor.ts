export type PatternRole = "primary" | "secondary" | "accent" | "quaternary";
// The collar and the cuff are chosen apart from the torso's patterns, which only reference the pattern
// roles in their `data-color-slot` / `data-stroke-slot` attributes.
export type ColorSlot = PatternRole | "collar" | "sleeveTrim";
export type ColorMap = Partial<Record<ColorSlot, string>>;

export function recolorSvg(svgMarkup: string, colors: ColorMap): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;

  for (const [attr, paint] of [
    ["data-color-slot", "fill"],
    ["data-stroke-slot", "stroke"],
  ] as const) {
    svg.querySelectorAll(`[${attr}]`).forEach((el) => {
      const slot = el.getAttribute(attr) as ColorSlot | null;
      const color = slot ? colors[slot] : undefined;
      if (color) el.setAttribute(paint, color);
    });
  }

  return new XMLSerializer().serializeToString(svg);
}
