import { describe, it, expect } from "vitest";
import { ACESFilmicToneMapping, NeutralToneMapping } from "three";
import {
  AMBIENT_INTENSITY,
  KEY_LIGHT_INTENSITY,
  KEY_LIGHT_POSITION,
  keyLightPositionFor,
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

describe("keyLightPositionFor (the key light follows the camera)", () => {
  const near = (actual: number[], expected: number[]) =>
    expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 5));

  it("keeps the usual spot when the camera looks at the front", () => {
    near(keyLightPositionFor(0, 3), KEY_LIGHT_POSITION);
  });

  it("goes behind the shirt when the camera looks at the back", () => {
    // Same offset turned half a turn around the shirt: x and z flip, height stays.
    near(keyLightPositionFor(0, -3), [-KEY_LIGHT_POSITION[0], KEY_LIGHT_POSITION[1], -KEY_LIGHT_POSITION[2]]);
  });

  it("follows a camera at the side: its forward offset points along the camera's side", () => {
    // Camera on +x: the offset's 'toward the camera' part (z=3) becomes +x and its 'right' part (x=2) becomes -z.
    near(keyLightPositionFor(3, 0), [3, 4, -2]);
  });

  it("keeps the same distance and height from every angle", () => {
    const [ox, oy, oz] = KEY_LIGHT_POSITION;
    for (let deg = 0; deg < 360; deg += 30) {
      const a = (deg * Math.PI) / 180;
      const [x, y, z] = keyLightPositionFor(Math.sin(a) * 3, Math.cos(a) * 3);
      expect(y).toBeCloseTo(oy, 5);
      expect(Math.hypot(x, z)).toBeCloseTo(Math.hypot(ox, oz), 5);
    }
  });

  it("always lights the side the camera sees, from the front to the back (Review Focus)", () => {
    for (let deg = 0; deg < 360; deg += 15) {
      const a = (deg * Math.PI) / 180;
      const cam = [Math.sin(a) * 3, Math.cos(a) * 3];
      const [x, , z] = keyLightPositionFor(cam[0], cam[1]);
      expect(x * cam[0] + z * cam[1]).toBeGreaterThan(0);
    }
  });

  it("does not break when the camera is right above the shirt", () => {
    near(keyLightPositionFor(0, 0), KEY_LIGHT_POSITION);
  });
});
