const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function rgb(hex: string): [number, number, number] | null {
  const match = HEX.exec(hex);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// WCAG relative luminance, 0 (black) to 1 (white). An unreadable color counts as white.
function luminance(hex: string): number {
  const channels = rgb(hex);
  if (!channels) return 1;
  const [r, g, b] = channels.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Black or white, whichever reads better on top of `hex`.
export function contrastColor(hex: string): "#000000" | "#ffffff" {
  const l = luminance(hex);
  const againstBlack = (l + 0.05) / 0.05;
  const againstWhite = 1.05 / (l + 0.05);
  return againstBlack >= againstWhite ? "#000000" : "#ffffff";
}

export function colorDistance(a: string, b: string): number {
  const first = rgb(a);
  const second = rgb(b);
  if (!first || !second) return 0;
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}
