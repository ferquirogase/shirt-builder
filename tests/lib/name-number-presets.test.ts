import { describe, it, expect } from "vitest";
import {
  NAME_NUMBER_PRESETS,
  DEFAULT_PRESET_ID,
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
  findNameNumberPreset,
  getNameNumberPreset,
  initialNameNumberStyle,
} from "@/lib/builder/name-number-presets";

describe("name-number presets", () => {
  it("offers only Clásico (Oswald 700) and Moderno (Montserrat 800)", () => {
    expect(NAME_NUMBER_PRESETS.map((p) => [p.id, p.label, p.cssVar, p.weight])).toEqual([
      ["classic", "Clásico", "--font-nn-oswald", 700],
      ["modern", "Moderno", "--font-nn-montserrat", 800],
    ]);
  });

  it("finds presets and falls back to the default for an unknown id", () => {
    expect(findNameNumberPreset("modern")?.label).toBe("Moderno");
    expect(findNameNumberPreset("retro")).toBeUndefined();
    expect(getNameNumberPreset("nope").id).toBe(DEFAULT_PRESET_ID);
  });

  it("starts white, classic and without a border", () => {
    expect(initialNameNumberStyle()).toEqual({ presetId: "classic", fill: "#ffffff", outline: false });
  });

  it("uses one fixed black outline", () => {
    expect(OUTLINE_COLOR).toBe("#000000");
    expect(OUTLINE_WIDTH).toBeGreaterThan(0);
    expect(OUTLINE_WIDTH).toBeLessThanOrEqual(0.12);
  });
});
