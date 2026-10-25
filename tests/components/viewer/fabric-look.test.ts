import { describe, expect, it } from "vitest";
import { LINING_COLOR } from "@/components/builder/viewer/fabric-look";

describe("LINING_COLOR", () => {
  it("is a light, neutral grey", () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(LINING_COLOR.slice(i, i + 2), 16));
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThanOrEqual(0xc8);
    expect(r).toBeLessThanOrEqual(0xe0);
  });
});
