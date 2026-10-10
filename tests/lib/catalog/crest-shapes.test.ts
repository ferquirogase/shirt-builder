import { describe, it, expect } from "vitest";
import { CREST_SHAPES, findCrestShape } from "@/lib/builder/catalog/crest-shapes";

describe("CREST_SHAPES", () => {
  it("has the 25 supplied shields with unique ids", () => {
    expect(CREST_SHAPES).toHaveLength(25);
    expect(new Set(CREST_SHAPES.map((s) => s.id)).size).toBe(25);
  });

  it("gives every shape a path and a box with a size", () => {
    for (const shape of CREST_SHAPES) {
      expect(shape.d.length).toBeGreaterThan(10);
      expect(shape.box.width).toBeGreaterThan(10);
      expect(shape.box.height).toBeGreaterThan(10);
    }
  });

  it("finds a shape by id", () => {
    expect(findCrestShape("shield-01")).toBe(CREST_SHAPES[0]);
    expect(findCrestShape("nope")).toBeUndefined();
  });
});
