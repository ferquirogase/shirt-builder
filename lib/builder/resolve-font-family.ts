// next/font exposes each font as a CSS variable on <html> whose value is the
// real (hashed) family name plus its metric-compatible fallback. The canvas
// can't read `var(...)`, so the value is resolved here.
export function resolveFontFamily(cssVar: string, fallback = "sans-serif"): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return value ? `${value}, ${fallback}` : fallback;
}
