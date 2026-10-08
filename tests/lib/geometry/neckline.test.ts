import { describe, it, expect } from "vitest";
import { createNecklineRounding } from "@/lib/builder/geometry/neckline";
import type { Vec3 } from "@/lib/builder/geometry/mesh-boundary";

const mirror = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

// The GEPE model's neckline: square at the front AND the back (right half
// listed, mirrored for the left), shoulders at y~295.
const half: Vec3[] = [
  [0, 273.9, 21.7],
  [15.3, 273.6, 21.9],
  [25.2, 272.5, 18.9],
  [26.6, 282.7, 13.0],
  [27.9, 291.8, 4.8],
  [29.3, 294.9, -4.8],
  [27.3, 290.5, -13.7],
  [25.1, 279.5, -20.4],
  [23.6, 271.9, -22.1],
  [14.2, 271.6, -23.8],
  [0, 271.3, -23.3],
];
const neck: Vec3[] = [...half, ...half.slice(1, -1).reverse().map(mirror)];

const TOP_Y = 294.9;
const FRONT_DROP = TOP_Y - 272.5;
const BACK_DROP = TOP_Y - 271.3;

describe("createNecklineRounding", () => {
  const options = { width: 0.6, depth: 0.5, backDepth: 0.15 };
  const round = createNecklineRounding(neck, options);
  const mapped = neck.map(round);

  const xs = neck.map((p) => p[0]);
  const zs = neck.map((p) => p[2]);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
  const a = ((Math.max(...xs) - Math.min(...xs)) / 2) * options.width;
  const b = ((Math.max(...zs) - Math.min(...zs)) / 2) * options.width;

  it("maps every point of the opening onto an ellipse in plan view", () => {
    for (const [x, , z] of mapped) {
      expect(((x - cx) / a) ** 2 + ((z - cz) / b) ** 2).toBeCloseTo(1, 1);
    }
  });

  it("narrows the opening by the requested factor", () => {
    expect(Math.abs(Math.max(...mapped.map((p) => Math.abs(p[0] - cx))) - a)).toBeLessThan(0.5);
  });

  it("sets the front scoop depth relative to the original", () => {
    const frontBottom = Math.min(...mapped.filter((p) => p[2] > cz + 0.8 * b).map((p) => p[1]));
    expect(frontBottom).toBeCloseTo(TOP_Y - FRONT_DROP * options.depth, 0);
  });

  it("makes the back scoop much shallower than the front", () => {
    const backBottom = Math.min(...mapped.filter((p) => p[2] < cz - 0.8 * b).map((p) => p[1]));
    expect(backBottom).toBeCloseTo(TOP_Y - BACK_DROP * options.backDepth, 0);
    expect(backBottom).toBeGreaterThan(TOP_Y - FRONT_DROP * options.depth);
  });

  it("has no vertical walls: the edge height varies smoothly around the opening", () => {
    const ordered = [...mapped].sort(
      (p, q) => Math.atan2(p[2] - cz, p[0] - cx) - Math.atan2(q[2] - cz, q[0] - cx)
    );
    for (let i = 1; i < ordered.length; i++) {
      expect(Math.abs(ordered[i][1] - ordered[i - 1][1])).toBeLessThan(4);
    }
  });

  it("is symmetric left/right", () => {
    const left = round([-25.2, 272.5, 18.9]);
    const right = round([25.2, 272.5, 18.9]);
    expect(left[0]).toBeCloseTo(-right[0] + 2 * cx, 5);
    expect(left[1]).toBeCloseTo(right[1], 5);
    expect(left[2]).toBeCloseTo(right[2], 5);
  });

  it("drags nearby fabric along with the edge, fading with distance", () => {
    const edge = [0, 273.9, 21.7] as Vec3;
    const edgeShift = round(edge)[1] - edge[1];
    const near = [0, 268, 21.7] as Vec3;
    const nearShift = round(near)[1] - near[1];
    const far = [0, 255, 21.7] as Vec3;
    const farShift = round(far)[1] - far[1];
    expect(edgeShift).toBeGreaterThan(5);
    expect(nearShift).toBeGreaterThan(0);
    expect(nearShift).toBeLessThan(edgeShift);
    expect(Math.abs(farShift)).toBeLessThan(nearShift);
  });

  it("leaves fabric far from the neckline untouched", () => {
    expect(round([60, 250, 5])).toEqual([60, 250, 5]);
    expect(round([0, 150, 20])).toEqual([0, 150, 20]);
    const [x, y, z] = round([45, 275, 0]);
    expect(Math.hypot(x - 45, y - 275, z)).toBeLessThan(0.5);
  });

  it("does not fold the fabric: heights below the edge keep their order", () => {
    const ys = [0, -3, -6, -10, -15, -22].map((d) => round([0, 273.9 + d, 21.7])[1]);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it("returns finite points with default options", () => {
    const same = createNecklineRounding(neck);
    for (const p of neck) {
      const q = same(p);
      expect(q[1]).toBeLessThanOrEqual(TOP_Y + 1e-6);
      expect(Number.isFinite(q[0] + q[1] + q[2])).toBe(true);
    }
  });
});
