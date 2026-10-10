import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JERSEY_BOTTOM_Y } from "@/lib/builder/geometry/jersey-model";
import { SHORTS_BOTTOM_Y, SHORTS_MODEL } from "@/lib/builder/geometry/shorts-model";

function objVertices(path: string): number[][] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("v "))
    .map((line) => line.trim().split(/\s+/).slice(1, 4).map(Number));
}

const vertices = objVertices("public/models/gepe_shorts.obj");
// Body only: the sleeves reach far wider than the torso.
const shirtBody = objVertices("public/models/gepe_shirt.obj").filter((v) => Math.abs(v[0]) < 45);
const SHIRT_BAND = 5;
// The shorts may reach the shirt's own hem width; a unit (a centimetre) is flush.
const POKE_TOLERANCE = 1;

describe("the real shorts model", () => {
  it("is loaded from the shorts OBJ and its normal map", () => {
    expect(SHORTS_MODEL.url).toBe("/models/gepe_shorts.obj");
    expect(SHORTS_MODEL.normalMapUrl).toBe("/textures/gepe-shorts-normal.png");
  });

  it("has the bottom edge SHORTS_BOTTOM_Y says", () => {
    expect(SHORTS_BOTTOM_Y).toBeCloseTo(Math.min(...vertices.map((v) => v[1])), 2);
  });

  it("has its waist tucked under the shirt, with no gap at the hem", () => {
    expect(Math.max(...vertices.map((v) => v[1]))).toBeGreaterThan(JERSEY_BOTTOM_Y);
  });

  it("stays inside the shirt's width at every height where the two overlap, so the waist cannot poke through it", () => {
    const overlap = vertices.filter((v) => v[1] > JERSEY_BOTTOM_Y);
    expect(overlap.length).toBeGreaterThan(0);
    for (const [x, y] of overlap) {
      // The shirt's body (not its sleeves) within 5 units of this height.
      const shirtHalfWidth = Math.max(
        ...shirtBody.filter((v) => Math.abs(v[1] - y) <= SHIRT_BAND).map((v) => Math.abs(v[0]))
      );
      expect(Math.abs(x)).toBeLessThanOrEqual(shirtHalfWidth + POKE_TOLERANCE);
    }
  });
});
