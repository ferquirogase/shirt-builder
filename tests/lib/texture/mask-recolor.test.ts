import { describe, it, expect } from "vitest";
import { recolorMaskPixels } from "@/lib/builder/texture/mask-recolor";

const COLORS = { primary: "#0a5c36", secondary: "#ffffff", accent: "#f5b700", quaternary: "#d0161f" };
const px = (...rgb: number[]) => new Uint8ClampedArray([...rgb, 255]);

describe("recolorMaskPixels", () => {
  it("paints black in the first color and pure red, green and blue in colors 2, 3 and 4", () => {
    for (const [mask, out] of [
      [[0, 0, 0], [0x0a, 0x5c, 0x36]],
      [[255, 0, 0], [255, 255, 255]],
      [[0, 255, 0], [0xf5, 0xb7, 0x00]],
      [[0, 0, 255], [0xd0, 0x16, 0x1f]],
    ]) {
      const data = px(...mask);
      recolorMaskPixels(data, COLORS);
      expect([...data]).toEqual([...out, 255]);
    }
  });

  it("mixes the colors on an antialiased edge, in proportion", () => {
    const data = px(128, 0, 0);
    recolorMaskPixels(data, { ...COLORS, primary: "#000000", secondary: "#ffffff" });
    expect(data[0]).toBeGreaterThanOrEqual(127);
    expect(data[0]).toBeLessThanOrEqual(129);
  });

  it("handles many pixels and leaves alpha alone", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 200]);
    recolorMaskPixels(data, COLORS);
    expect([...data]).toEqual([255, 255, 255, 255, 0x0a, 0x5c, 0x36, 200]);
  });

  it("uses the first color for a role the design does not give", () => {
    const data = px(0, 0, 255);
    recolorMaskPixels(data, { primary: "#102030" });
    expect([...data]).toEqual([0x10, 0x20, 0x30, 255]);
  });
});
