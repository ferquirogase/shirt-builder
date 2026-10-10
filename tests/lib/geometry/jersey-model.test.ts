import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JERSEY_BOTTOM_Y, JERSEY_CENTER_Y, JERSEY_TOP_Y } from "@/lib/builder/geometry/jersey-model";

function objYs(path: string): number[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("v "))
    .map((line) => Number(line.trim().split(/\s+/)[2]));
}

// JerseyModel centers the shirt by the middle of its vertical extent; the
// shorts and the camera framing are placed with these constants, so they must
// match the real OBJ.
describe("the shirt's vertical extent", () => {
  const ys = objYs("public/models/gepe_shirt.obj");

  it("has the bottom and top edges of the shirt OBJ", () => {
    expect(JERSEY_BOTTOM_Y).toBeCloseTo(Math.min(...ys), 2);
    expect(JERSEY_TOP_Y).toBeCloseTo(Math.max(...ys), 2);
  });

  it("centres on the middle of that extent", () => {
    expect(JERSEY_CENTER_Y).toBeCloseTo((Math.min(...ys) + Math.max(...ys)) / 2, 1);
  });
});
