import { describe, it, expect } from "vitest";
import { DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_RADIUS } from "@/lib/builder/geometry/camera-math";
import { framingFor } from "@/lib/builder/geometry/set-framing";

describe("framingFor", () => {
  it("leaves the shirt and the camera where they were when there are no shorts", () => {
    expect(framingFor(false)).toEqual({
      lift: 0,
      floorY: -0.6,
      shadowFar: 1.6,
      cameraRadius: DEFAULT_CAMERA_RADIUS,
      cameraHeight: DEFAULT_CAMERA_HEIGHT,
    });
  });

  it("raises the set so the taller kit is centred on the origin", () => {
    // Shirt top 294.91 and shorts bottom 13.73 are 0.01 units apart per OBJ unit.
    expect(framingFor(true).lift).toBeCloseTo(0.767, 2);
  });

  it("puts the floor just under the shorts, lower than the shirt-only floor", () => {
    const withShorts = framingFor(true);
    expect(withShorts.floorY).toBeLessThan(-0.6);
    expect(withShorts.floorY).toBeCloseTo(-1.366, 2);
  });

  it("pulls the camera back, keeping the same tilt", () => {
    const withShorts = framingFor(true);
    expect(withShorts.cameraRadius).toBeGreaterThan(DEFAULT_CAMERA_RADIUS);
    expect(withShorts.cameraHeight / withShorts.cameraRadius).toBeCloseTo(DEFAULT_CAMERA_HEIGHT / DEFAULT_CAMERA_RADIUS, 5);
  });

  it("keeps the camera inside the viewer's zoom range", () => {
    const { cameraRadius, cameraHeight } = framingFor(true);
    expect(Math.hypot(cameraRadius, cameraHeight)).toBeLessThan(6);
  });

  it("lets the contact shadow reach the whole shorts", () => {
    expect(framingFor(true).shadowFar).toBeGreaterThan(framingFor(false).shadowFar);
  });
});
