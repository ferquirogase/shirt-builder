export type PatternRole = "primary" | "secondary" | "accent";
// The collar and the sleeves are chosen independently of the torso's patterns, which only reference
// the three pattern roles in their `data-color-slot` attributes.
export type ColorSlot = PatternRole | "collar" | "sleeve" | "sleeveTrim";
export type ColorMap = Partial<Record<ColorSlot, string>>;

export function recolorSvg(svgMarkup: string, colors: ColorMap): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;

  svg.querySelectorAll("[data-color-slot]").forEach((el) => {
    const slot = el.getAttribute("data-color-slot") as ColorSlot | null;
    const color = slot ? colors[slot] : undefined;
    if (color) {
      el.setAttribute("fill", color);
    }
  });

  return new XMLSerializer().serializeToString(svg);
}
