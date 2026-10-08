import { describe, it, expect } from "vitest";
import { createGarmentReshape, SHAPE } from "@/lib/builder/geometry/garment-shape";

describe("createGarmentReshape", () => {
  const reshape = createGarmentReshape();

  it("leaves the shoulders, neck and upper chest untouched", () => {
    for (const p of [[0, 298, 10], [20, 290, -15], [30, 270, 5], [-33, 245, 20]] as const) {
      expect(reshape([...p])).toEqual([...p]);
    }
  });

  it("shortens the torso below the armpit", () => {
    const [, y] = reshape([36, 161.8, 20]);
    expect(y).toBeGreaterThan(175);
    expect(y).toBeLessThan(190);
  });

  it("keeps vertical order (never folds the fabric)", () => {
    const ys = [240, 238, 232, 226, 220, 200, 180, 162].map((y) => reshape([30, y, 10])[1]);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it("widens the chest so it is no narrower than the waist", () => {
    const chest = reshape([33.5, 205, 20])[0];
    const hem = reshape([39.5, 162, 20])[0];
    expect(chest).toBeGreaterThanOrEqual(hem - 1.5);
  });

  it("is symmetric left/right", () => {
    const l = reshape([-30, 200, 8]);
    const r = reshape([30, 200, 8]);
    expect(l[0]).toBeCloseTo(-r[0], 6);
    expect(l[1]).toBeCloseTo(r[1], 6);
  });

  it("shortens the sleeves toward the shoulder, leaving the shoulder joint alone", () => {
    const tip = reshape([68, 250, -4]);
    expect(tip[0]).toBeLessThan(63);
    expect(tip[0]).toBeGreaterThan(SHAPE.sleeveAnchor[0]);
    expect(reshape([38, 272, -4])).toEqual([38, 272, -4]);
  });

  it("keeps the sleeve opening open (the cuff is not squashed flat)", () => {
    const cuffTop = reshape([60, 253, -3]);
    const cuffBottom = reshape([60, 241, -3]);
    expect(cuffTop[1] - cuffBottom[1]).toBeGreaterThan(8);
  });
});
