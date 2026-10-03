import { describe, it, expect } from "vitest";
import {
  VIEW_AZIMUTH,
  azimuthOf,
  normalizeAngle,
  offsetAt,
  shortestDelta,
  stepAzimuth,
} from "@/lib/builder/camera-math";

describe("camera math", () => {
  it("maps front to 0 and back to PI", () => {
    expect(VIEW_AZIMUTH.front).toBe(0);
    expect(VIEW_AZIMUTH.back).toBe(Math.PI);
  });

  it("normalizes angles into (-PI, PI]", () => {
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeAngle(7)).toBeCloseTo(7 - 2 * Math.PI);
  });

  it("takes the short way around, across the +/-PI seam", () => {
    expect(shortestDelta(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6.0);
    expect(shortestDelta(-3.0, 3.0)).toBeCloseTo(-(2 * Math.PI - 6.0));
    expect(shortestDelta(0.1, 0.4)).toBeCloseTo(0.3);
  });

  it("converges to the target without overshooting", () => {
    let a = 2.9;
    for (let i = 0; i < 200; i++) a = stepAzimuth(a, VIEW_AZIMUTH.back, 0.12);
    expect(Math.abs(shortestDelta(a, VIEW_AZIMUTH.back))).toBeLessThan(1e-6);
  });

  it("snaps when within epsilon", () => {
    const next = stepAzimuth(0.001, 0, 0.12, 0.002);
    expect(next).toBeCloseTo(0);
  });

  it("rotates the short way when the camera is past the seam", () => {
    // Camera dragged to azimuth -3.0, which is already almost at the back (-PI == PI).
    const next = stepAzimuth(-3.0, VIEW_AZIMUTH.back, 0.5);
    expect(next).toBeLessThan(-3.0); // moves further negative toward -PI, not the long way through 0
  });

  it("round-trips an offset through azimuthOf", () => {
    const { x, z } = offsetAt(3, 1.2);
    expect(azimuthOf(x, z)).toBeCloseTo(1.2);
    expect(Math.hypot(x, z)).toBeCloseTo(3);
  });

  it("puts the front camera on +z and the back camera on -z", () => {
    expect(offsetAt(3, VIEW_AZIMUTH.front).z).toBeCloseTo(3);
    expect(offsetAt(3, VIEW_AZIMUTH.back).z).toBeCloseTo(-3);
  });
});
