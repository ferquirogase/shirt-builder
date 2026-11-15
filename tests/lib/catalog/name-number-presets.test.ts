import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  NAME_NUMBER_PRESETS,
  DEFAULT_PRESET_ID,
  DIGIT_HEIGHT,
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
  findNameNumberPreset,
  getNameNumberPreset,
  initialNameNumberStyle,
} from "@/lib/builder/catalog/name-number-presets";

const FONTS_MODULE = "app/fonts/name-number/fonts.ts";

describe("name-number presets", () => {
  it("offers the ten typefaces the owners sent, under generic names", () => {
    expect(NAME_NUMBER_PRESETS.map((p) => p.label)).toEqual([
      "Bloque",
      "Compacta",
      "Angosta",
      "Cuadrada",
      "Retro",
      "Curva",
      "Redondeada",
      "Clásica",
      "Fina",
      "Ancha",
    ]);
  });

  it("never names a team", () => {
    const teams = /alnassr|argentina|atalanta|boca|monterrey|manchester|united|nigeria|roma|napoli/i;
    for (const preset of NAME_NUMBER_PRESETS) {
      expect(preset.label).not.toMatch(teams);
      expect(preset.id).not.toMatch(teams);
      expect(preset.file).not.toMatch(teams);
    }
  });

  it("has a font file for each typeface, declared in the fonts module under the preset's CSS variable", () => {
    const fontsModule = readFileSync(FONTS_MODULE, "utf8");
    for (const preset of NAME_NUMBER_PRESETS) {
      expect(existsSync(`app/fonts/name-number/${preset.file}`)).toBe(true);
      expect(preset.cssVar).toBe(`--font-nn-${preset.id}`);
      expect(fontsModule).toContain(`"./${preset.file}"`);
      expect(fontsModule).toContain(`"${preset.cssVar}"`);
    }
  });

  it("scales each typeface so its digits are as tall as the others'", () => {
    for (const preset of NAME_NUMBER_PRESETS) {
      expect(preset.digitHeight * preset.numberScale).toBeCloseTo(DIGIT_HEIGHT, 5);
      expect(preset.nameScale).toBe(preset.numberScale);
    }
  });

  it("finds presets and falls back to the default for an unknown id", () => {
    expect(findNameNumberPreset("angosta")?.label).toBe("Angosta");
    expect(findNameNumberPreset("nope")).toBeUndefined();
    expect(getNameNumberPreset("nope").id).toBe(DEFAULT_PRESET_ID);
  });

  it("gives the default to a design saved with the Clásico (Oswald) that is no longer offered", () => {
    expect(findNameNumberPreset("classic")).toBeUndefined();
    expect(getNameNumberPreset("classic").id).toBe("bloque");
  });

  it("starts white, in Bloque and with a black border, so the text does not get lost against the cloth", () => {
    expect(initialNameNumberStyle()).toEqual({ presetId: "bloque", fill: "#ffffff", outline: true, outlineColor: "#000000" });
  });

  it("has black as the default border color, and a visible border thickness", () => {
    expect(OUTLINE_COLOR).toBe("#000000");
    expect(OUTLINE_WIDTH).toBeGreaterThan(0);
    expect(OUTLINE_WIDTH).toBeLessThanOrEqual(0.12);
  });
});
