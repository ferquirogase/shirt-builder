import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";

// JerseyModel centers the shirt by the middle of its vertical extent; the
// shorts are placed with this constant, so it must match the real OBJ.
describe("JERSEY_CENTER_Y", () => {
  it("is the middle of the shirt OBJ's vertical extent", () => {
    const ys = readFileSync("public/models/gepe_shirt.obj", "utf8")
      .split("\n")
      .filter((line) => line.startsWith("v "))
      .map((line) => Number(line.trim().split(/\s+/)[2]));
    const center = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(JERSEY_CENTER_Y).toBeCloseTo(center, 1);
  });
});
