// The CMYK equivalent of an on-screen color, for whoever prints the design. This is the plain
// mathematical conversion from RGB: it does not know the printer's inks or color profile, so
// the printed color can still differ a little from what the screen shows.
export type Cmyk = { c: number; m: number; y: number; k: number };

export function hexToCmyk(hex: string): Cmyk | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);

  const k = 1 - Math.max(r, g, b);
  // Pure black: nothing is left to split between the three inks.
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const ink = (channel: number) => Math.round(((1 - channel - k) / (1 - k)) * 100);
  return { c: ink(r), m: ink(g), y: ink(b), k: Math.round(k * 100) };
}

/** "C 0 M 100 Y 100 K 0", or an empty string when the value is not a color. */
export function formatCmyk(hex: string): string {
  const cmyk = hexToCmyk(hex);
  return cmyk ? `C ${cmyk.c} M ${cmyk.m} Y ${cmyk.y} K ${cmyk.k}` : "";
}
