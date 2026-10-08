import { describe, it, expect } from "vitest";
import {
  NAME_NUMBER_PRESETS,
  DEFAULT_PRESET_ID,
  MAX_OUTLINE_WIDTH,
  findNameNumberPreset,
  getNameNumberPreset,
  styleFromPreset,
} from "@/lib/builder/name-number-presets";

describe("name-number presets", () => {
  it("has six presets with unique ids and a font variable and weight each", () => {
    expect(NAME_NUMBER_PRESETS).toHaveLength(6);
    const ids = NAME_NUMBER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of NAME_NUMBER_PRESETS) {
      expect(p.cssVar).toMatch(/^--font-nn-/);
      expect(p.weight).toBeGreaterThanOrEqual(400);
      expect(p.outlineWidth).toBeGreaterThanOrEqual(0);
      expect(p.outlineWidth).toBeLessThanOrEqual(MAX_OUTLINE_WIDTH);
    }
  });

  it("uses the agreed fonts and weights", () => {
    const byId = Object.fromEntries(NAME_NUMBER_PRESETS.map((p) => [p.id, p]));
    expect(byId.classic).toMatchObject({ cssVar: "--font-nn-oswald", weight: 700 });
    expect(byId.modern).toMatchObject({ cssVar: "--font-nn-montserrat", weight: 800 });
    expect(byId.retro).toMatchObject({ cssVar: "--font-nn-righteous", weight: 400 });
    expect(byId.block).toMatchObject({ cssVar: "--font-nn-anton", weight: 400 });
    expect(byId.elegant).toMatchObject({ cssVar: "--font-nn-playfair", weight: 900 });
    expect(byId.outline).toMatchObject({ cssVar: "--font-nn-alfa-slab", weight: 400 });
  });

  it("finds presets and falls back to the default for an unknown id", () => {
    expect(findNameNumberPreset("retro")?.label).toBe("Retro");
    expect(findNameNumberPreset("nope")).toBeUndefined();
    expect(getNameNumberPreset("nope").id).toBe(DEFAULT_PRESET_ID);
  });

  it("builds a style from a preset's defaults, or null for an unknown id", () => {
    const retro = findNameNumberPreset("retro")!;
    expect(styleFromPreset("retro")).toEqual({
      presetId: "retro",
      fill: retro.fill,
      outlineColor: retro.outlineColor,
      outlineWidth: retro.outlineWidth,
      shadow: retro.shadow,
    });
    expect(styleFromPreset("nope")).toBeNull();
  });
});
