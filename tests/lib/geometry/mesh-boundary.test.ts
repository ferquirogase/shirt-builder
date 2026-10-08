import { describe, it, expect } from "vitest";
import { findBoundaryLoops, pickNeckLoop } from "@/lib/builder/geometry/mesh-boundary";

// Non-indexed triangle soup of an open cylinder: `n` quads around, two rings.
function openCylinder(n: number, r: number, y0: number, y1: number): number[] {
  const pt = (i: number, y: number) => [Math.cos((i / n) * 2 * Math.PI) * r, y, Math.sin((i / n) * 2 * Math.PI) * r];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pt(i, y0), b = pt(i + 1, y0), c = pt(i + 1, y1), d = pt(i, y1);
    out.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  return out;
}

describe("findBoundaryLoops", () => {
  it("finds the two rings of an open cylinder, welding duplicated vertices", () => {
    const loops = findBoundaryLoops(openCylinder(12, 5, 0, 10));
    expect(loops).toHaveLength(2);
    expect(loops.map((l) => l.length)).toEqual([12, 12]);
  });

  it("returns each loop as a connected cycle", () => {
    const [loop] = findBoundaryLoops(openCylinder(12, 5, 0, 10));
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(3);
    }
  });

  it("finds nothing on a closed surface", () => {
    // tetrahedron
    const p = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const tris = [[0, 2, 1], [0, 1, 3], [1, 2, 3], [0, 3, 2]];
    expect(findBoundaryLoops(tris.flatMap((t) => t.flatMap((i) => p[i])))).toEqual([]);
  });
});

describe("pickNeckLoop", () => {
  it("picks the loop with the highest mean y", () => {
    const loops = findBoundaryLoops(openCylinder(12, 5, 0, 10));
    const neck = pickNeckLoop(loops);
    expect(neck.every((p) => p[1] === 10)).toBe(true);
  });
});
