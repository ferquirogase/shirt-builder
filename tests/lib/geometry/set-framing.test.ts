import { describe, it, expect } from "vitest";
import { framingFor } from "@/lib/builder/geometry/set-framing";

describe("framingFor", () => {
  it("leaves the shirt where it was when there are no shorts", () => {
    expect(framingFor(false)).toEqual({ lift: 0, floorY: -0.6 });
  });

  it("raises the set and lowers the floor to fit the shorts", () => {
    const withShorts = framingFor(true);
    expect(withShorts.lift).toBeGreaterThan(0);
    expect(withShorts.floorY).toBeLessThan(-0.6);
  });
});
