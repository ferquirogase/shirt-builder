import { describe, it, expect } from "vitest";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { BODY_PATTERNS } from "@/lib/builder/catalog/patterns";
import { SHORTS_PATTERNS } from "@/lib/builder/catalog/shorts-patterns";

const NEUTRALS = ["#ffffff", "#000000", "#a6a6a6", "#4d4d4d"];

// Someone who arrives sees the kit in white, black and grays, a blank canvas to paint, and chooses the
// colors themselves: nothing comes in a team's colors until they do.
describe("the kit a new visitor sees", () => {
  it("is a light gray shirt with white stripes, collar and cuffs", () => {
    expect(initialDesignState.colors).toEqual({
      primary: "#a6a6a6",
      secondary: "#ffffff",
      accent: "#4d4d4d",
      quaternary: "#000000",
      collar: "#ffffff",
      sleeveTrim: "#ffffff",
    });
  });

  it("has dark gray shorts, white and light gray for their other colors", () => {
    expect(initialDesignState.shorts.colors).toEqual({ primary: "#4d4d4d", secondary: "#ffffff", accent: "#a6a6a6" });
  });

  it("brings only neutrals when another design is picked, on the shirt or the shorts", () => {
    for (const pattern of [...BODY_PATTERNS, ...SHORTS_PATTERNS])
      for (const color of pattern.colors) expect(NEUTRALS, `${pattern.id} ${color.role}`).toContain(color.default);
  });
});
