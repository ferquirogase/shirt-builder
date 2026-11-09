import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BODY_PATTERNS, PLAIN_BACK } from "@/lib/builder/catalog/patterns";
import { backVisibleWidth } from "@/lib/builder/texture/texture-compositor";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";

// Going round the shirt is a strip: the front (512 px, seen from the front) and then the back (as seen from
// behind, `backVisibleWidth` px of its 512 show on the cloth, at the same scale). The front's right edge
// meets the back's left edge, and the back's right edge meets the front's left edge. A design continues
// when both seams show the same thing at every height.

const SIZE = 512;
const ROWS = [4, 40, 90, 150, 200, 250, 300, 350, 400, 450, 508];

type Shape = { slot: string; opacity: string; contains: (x: number, y: number) => boolean };

function shapesOf(svgPath: string): Shape[] {
  const markup = fs.readFileSync(path.join(process.cwd(), "public", svgPath), "utf8");
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const shapes: Shape[] = [];
  doc.documentElement.querySelectorAll("rect, polygon").forEach((el) => {
    const slot = el.getAttribute("data-color-slot");
    if (!slot) return;
    // The only transforms used are, on a <g>, a horizontal scale or a horizontal move.
    const transform = el.closest("g[transform]")?.getAttribute("transform") ?? "";
    const scale = Number(transform.match(/scale\(([\d.]+)/)?.[1] ?? 1);
    const dx = Number(transform.match(/translate\((-?[\d.]+)/)?.[1] ?? 0);
    const opacity = el.getAttribute("fill-opacity") ?? "1";
    if (el.tagName === "rect") {
      const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => Number(el.getAttribute(a)));
      shapes.push({ slot, opacity, contains: (px, py) => px >= x * scale + dx && px < (x + w) * scale + dx && py >= y && py < y + h });
    } else {
      const pts = el
        .getAttribute("points")!
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number) as [number, number])
        .map(([x, y]) => [x * scale + dx, y] as [number, number]);
      shapes.push({
        slot,
        opacity,
        contains: (px, py) => {
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i];
            const [xj, yj] = pts[j];
            if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
          }
          return inside;
        },
      });
    }
  });
  return shapes;
}

const colorAt = (shapes: Shape[], x: number, y: number) => {
  const hit = shapes.filter((s) => s.contains(x, y));
  const last = hit[hit.length - 1];
  return last ? `${last.slot}:${last.opacity}` : "none";
};

describe("the patterns round the shirt", () => {
  it("has a back that shows 396 of its 512 px: the back panel is narrower than the front, at the same scale", () => {
    expect(backVisibleWidth(GEPE_UV_REGIONS, SIZE)).toBeGreaterThan(390);
    expect(backVisibleWidth(GEPE_UV_REGIONS, SIZE)).toBeLessThan(400);
  });

  // A plain back (Geométrico, Líneas onduladas) is a choice, not a continuation.
  const continuing = BODY_PATTERNS.filter((p) => p.svgPathBack !== PLAIN_BACK);
  const visible = Math.floor(backVisibleWidth(GEPE_UV_REGIONS, SIZE));

  it.each(continuing.map((p) => ({ id: p.id, p })))("$id meets itself at both seams", ({ p }) => {
    const front = shapesOf(p.svgPath);
    const back = shapesOf(p.svgPathBack ?? p.svgPath);
    for (const y of ROWS) {
      // wearer's left: the front's right edge, the back's left edge
      expect(colorAt(front, SIZE - 0.5, y), `${p.id} left seam, y=${y}`).toBe(colorAt(back, 0.5, y));
      // wearer's right: the back's right edge, the front's left edge
      expect(colorAt(back, visible - 0.5, y), `${p.id} right seam, y=${y}`).toBe(colorAt(front, 0.5, y));
    }
  });
});
