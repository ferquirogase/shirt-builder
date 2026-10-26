import { describe, it, expect } from "vitest";
import {
  NAME_NUMBER_PRESETS,
  DEFAULT_PRESET_ID,
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
  findNameNumberPreset,
  getNameNumberPreset,
  initialNameNumberStyle,
} from "@/lib/builder/catalog/name-number-presets";

describe("name-number presets", () => {
  it("offers only Clásico (Oswald 700)", () => {
    expect(NAME_NUMBER_PRESETS.map((p) => [p.id, p.label, p.cssVar, p.weight])).toEqual([
      ["classic", "Clásico", "--font-nn-oswald", 700],
    ]);
  });

  it("finds presets and falls back to the default for an unknown id", () => {
    expect(findNameNumberPreset("classic")?.label).toBe("Clásico");
    expect(findNameNumberPreset("retro")).toBeUndefined();
    expect(getNameNumberPreset("nope").id).toBe(DEFAULT_PRESET_ID);
  });

  it("gives Clásico to a design saved with the Moderno that is no longer offered", () => {
    expect(findNameNumberPreset("modern")).toBeUndefined();
    expect(getNameNumberPreset("modern").id).toBe("classic");
  });

  it("starts white, classic and with a black border, so the text does not get lost against the cloth", () => {
    expect(initialNameNumberStyle()).toEqual({ presetId: "classic", fill: "#ffffff", outline: true, outlineColor: "#000000" });
  });

  it("has black as the default border color, and a visible border thickness", () => {
    expect(OUTLINE_COLOR).toBe("#000000");
    expect(OUTLINE_WIDTH).toBeGreaterThan(0);
    expect(OUTLINE_WIDTH).toBeLessThanOrEqual(0.12);
  });
});
