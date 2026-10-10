import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JERSEY_BOTTOM_Y } from "@/lib/builder/geometry/jersey-model";
import { SHORTS_BOTTOM_Y, SHORTS_MODEL } from "@/lib/builder/geometry/shorts-model";

const vertices = readFileSync("public/models/gepe_shorts.obj", "utf8")
  .split("\n")
  .filter((line) => line.startsWith("v "))
  .map((line) => line.trim().split(/\s+/).slice(1, 4).map(Number));

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

  it("stays inside the shirt's width where the two overlap, so the waist cannot poke through it", () => {
    const overlap = vertices.filter((v) => v[1] > JERSEY_BOTTOM_Y);
    expect(overlap.length).toBeGreaterThan(0);
    expect(Math.max(...overlap.map((v) => Math.abs(v[0])))).toBeLessThan(36);
  });
});
