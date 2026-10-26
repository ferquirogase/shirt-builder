import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { SIZE_GUIDES, guidesFor } from "@/lib/checkout/size-guides";

// GEPE's own size charts, as the pictures it publishes: the measures and how to take them.
describe("size guides", () => {
  it("has GEPE's chart for the shirt and for the shorts", () => {
    expect(SIZE_GUIDES.map((g) => [g.id, g.label])).toEqual([
      ["shirt", "Camiseta"],
      ["shorts", "Short"],
    ]);
  });

  it("points each one to a picture that is there", () => {
    for (const guide of SIZE_GUIDES) {
      expect(guide.image).toMatch(/^\/talles\/[a-z-]+\.webp$/);
      expect(existsSync(`public${guide.image}`), guide.image).toBe(true);
    }
  });

  it("describes each picture for those who cannot see it, with its sizes", () => {
    for (const guide of SIZE_GUIDES) expect(guide.alt.length).toBeGreaterThan(40);
    expect(SIZE_GUIDES[0].alt).toMatch(/XS/);
    expect(SIZE_GUIDES[0].alt).toMatch(/kids/i);
    expect(SIZE_GUIDES[1].alt).toMatch(/XXXL/);
  });

  it("offers only the shirt's chart when the order has no shorts", () => {
    expect(guidesFor({ withShorts: false }).map((g) => g.id)).toEqual(["shirt"]);
  });

  it("adds the shorts' chart when the order has them", () => {
    expect(guidesFor({ withShorts: true }).map((g) => g.id)).toEqual(["shirt", "shorts"]);
  });
});
