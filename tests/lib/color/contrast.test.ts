import { describe, it, expect } from "vitest";
import { colorDistance, contrastColor } from "@/lib/builder/color/contrast";

describe("contrastColor", () => {
  it("is black on light colors and white on dark ones", () => {
    expect(contrastColor("#ffffff")).toBe("#000000");
    expect(contrastColor("#f5b700")).toBe("#000000");
    expect(contrastColor("#0a5c36")).toBe("#ffffff");
    expect(contrastColor("#000000")).toBe("#ffffff");
  });

  it("falls back to black when the color cannot be read", () => {
    expect(contrastColor("not-a-color")).toBe("#000000");
  });
});

describe("colorDistance", () => {
  it("is zero for the same color and grows with the difference", () => {
    expect(colorDistance("#123456", "#123456")).toBe(0);
    expect(colorDistance("#000000", "#ffffff")).toBeCloseTo(441.67, 1);
  });

  it("is zero when a color cannot be read", () => {
    expect(colorDistance("nope", "#ffffff")).toBe(0);
  });
});
