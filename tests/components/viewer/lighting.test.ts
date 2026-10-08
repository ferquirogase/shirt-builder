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

  it("does not overexpose the cloth: the brightest spot never exceeds its true color", () => {
    // The first version (1.21) blew whites out and bent reds toward orange.
    expect(peakDiffuseGain()).toBeLessThanOrEqual(1);
  });

  it("is not dull either: the brightest spot reaches at least 90% of the true color", () => {
    // 0.83 looked a little dark on the shirt.
    expect(peakDiffuseGain()).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps the key light stronger than the ambient fill, so the shirt has shading", () => {
    expect(KEY_LIGHT_INTENSITY).toBeGreaterThan(AMBIENT_INTENSITY);
  });
});
