import { describe, it, expect } from "vitest";
import { SHORTS_PATTERNS, findShortsPattern, shortsColorsFor } from "@/lib/builder/catalog/shorts-patterns";

describe("shorts designs", () => {
  it("are the plain shorts and the owners' three designs (ESTAMPAS WEB.pdf, page 6), plain first", () => {
    expect(SHORTS_PATTERNS.map((p) => p.id)).toEqual(["shorts-plain", "shorts-hem-band", "shorts-side-stripe", "shorts-side-two-tone"]);
    expect(new Set(SHORTS_PATTERNS.map((p) => p.label)).size).toBe(SHORTS_PATTERNS.length);
  });

  it("use one, two or three colors, named like the shirt's", () => {
    const roles = (id: string) => findShortsPattern(id)!.colors.map((c) => c.role);
    expect(roles("shorts-plain")).toEqual(["primary"]);
    expect(roles("shorts-hem-band")).toEqual(["primary", "secondary"]);
    expect(roles("shorts-side-stripe")).toEqual(["primary", "secondary"]);
    expect(roles("shorts-side-two-tone")).toEqual(["primary", "secondary", "accent"]);
    expect(findShortsPattern("shorts-side-two-tone")!.colors.map((c) => c.label)).toEqual(["Color principal", "Color 2", "Color 3"]);
  });

  it("finds nothing for an unknown design, whose colors are then just the main one", () => {
    expect(findShortsPattern("nope")).toBeUndefined();
    expect(shortsColorsFor("nope").map((c) => c.role)).toEqual(["primary"]);
  });
});
