import { describe, it, expect } from "vitest";
import { ACESFilmicToneMapping, NeutralToneMapping } from "three";
import {
  AMBIENT_INTENSITY,
  KEY_LIGHT_INTENSITY,
  TONE_MAPPING,
  TONE_MAPPING_EXPOSURE,
  peakDiffuseGain,
} from "@/components/builder/viewer/lighting";

describe("viewer lighting", () => {
  it("uses neutral tone mapping, not the ACES default that shifts saturated reds toward orange", () => {
    expect(TONE_MAPPING).toBe(NeutralToneMapping);
    expect(TONE_MAPPING).not.toBe(ACESFilmicToneMapping);
    expect(TONE_MAPPING_EXPOSURE).toBe(1);
  });

  it("does not overexpose the cloth: the brightest spot stays below its true color", () => {
    expect(peakDiffuseGain()).toBeLessThanOrEqual(0.9);
  });

  it("is not dull either: the brightest spot keeps at least 60% of the true color", () => {
    expect(peakDiffuseGain()).toBeGreaterThanOrEqual(0.6);
  });

  it("keeps the key light stronger than the ambient fill, so the shirt has shading", () => {
    expect(KEY_LIGHT_INTENSITY).toBeGreaterThan(AMBIENT_INTENSITY);
  });
});
