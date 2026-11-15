import type { ColorMap } from "./svg-recolor";

function rgb(hex: string | undefined): [number, number, number] | null {
  const m = hex ? /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim()) : null;
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/**
 * Paints a color mask (see scripts/moldes/extract_moldes.py) in the user's colors, in place: red, green and
 * blue are how much of colors 2, 3 and 4 a pixel has, and what is left is the first color. An antialiased
 * edge has some of each, so it comes out mixed. Alpha is left as it is.
 */
export function recolorMaskPixels(data: Uint8ClampedArray, colors: ColorMap): void {
  const p = rgb(colors.primary) ?? [0, 0, 0];
  const s = rgb(colors.secondary) ?? p;
  const a = rgb(colors.accent) ?? p;
  const q = rgb(colors.quaternary) ?? p;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;
    const sum = r + g + b;
    if (sum > 1) {
      r /= sum;
      g /= sum;
      b /= sum;
    }
    const k = 1 - r - g - b;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(p[c] * k + s[c] * r + a[c] * g + q[c] * b);
  }
}
