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

  it("has a straight hem on both legs, with no side slit rising from it", () => {
    // Open edges belong to one face only: the waist, the two hems and nothing else.
    const lines = readFileSync("public/models/gepe_shorts.obj", "utf8").split("\n");
    const faceCount = new Map<string, number>();
    for (const line of lines.filter((l) => l.startsWith("f "))) {
      const ids = line.trim().split(/\s+/).slice(1).map((t) => Number(t.split("/")[0]));
      ids.forEach((a, i) => {
        const b = ids[(i + 1) % ids.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        faceCount.set(key, (faceCount.get(key) ?? 0) + 1);
      });
    }
    const hemEdgeYs = [...faceCount]
      .filter(([, count]) => count === 1)
      .flatMap(([key]) => key.split("-").map((id) => vertices[Number(id) - 1][1]))
      .filter((y) => y < 150);
    expect(hemEdgeYs.length).toBeGreaterThan(0);
    // The hem itself sways from 113.7 to about 117.3; the slit rose to 125.
    expect(Math.max(...hemEdgeYs)).toBeLessThan(118);
  });

  it("has the cloth's print sewn where the slit was closed, so a side stripe does not narrow at the hem", () => {
    // Each vertex of the closed slit (the outer side, near the hem) takes one spot on the print.
    const uvsAt = new Map<number, Set<string>>();
    const lines = readFileSync("public/models/gepe_shorts.obj", "utf8").split("\n");
    for (const line of lines.filter((l) => l.startsWith("f "))) {
      for (const corner of line.trim().split(/\s+/).slice(1)) {
        const [v, vt] = corner.split("/");
        if (!uvsAt.has(Number(v))) uvsAt.set(Number(v), new Set());
        uvsAt.get(Number(v))!.add(vt);
      }
    }
    const slitSide = [...uvsAt].filter(([v]) => {
      const [x, y] = vertices[v - 1];
      return Math.abs(x) > 36 && y > 116 && y < 126;
    });
    expect(slitSide.length).toBeGreaterThan(0);
    for (const [, uvs] of slitSide) expect(uvs.size).toBe(1);
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
