import { describe, it, expect } from "vitest";
import { OTHER_COLOR_NAME, PALETTE, colorName, findPaletteColor } from "@/lib/builder/color/palette";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { formatCmyk } from "@/lib/builder/color/cmyk";

// The closed set of colors the player picks from. It is provisional until the printer's own list
// (with its CMYK) replaces it: what these tests pin is what the rest of the app relies on.
describe("the palette", () => {
  it("has a score of colors, each with a name and a six-digit hexadecimal", () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(18);
    expect(PALETTE.length).toBeLessThanOrEqual(24);
    for (const { hex, name } of PALETTE) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(name.trim()).not.toBe("");
    }
  });

  it("repeats neither a color nor a name, so a swatch is never ambiguous", () => {
    expect(new Set(PALETTE.map((c) => c.hex)).size).toBe(PALETTE.length);
    expect(new Set(PALETTE.map((c) => c.name)).size).toBe(PALETTE.length);
  });

  it("has black and white, which the text and the trims fall back to", () => {
    expect(findPaletteColor("#000000")?.name).toBe("Negro");
    expect(findPaletteColor("#ffffff")?.name).toBe("Blanco");
  });

  it("holds every color a new design starts with, so the first pick is on the palette", () => {
    const { colors, nameNumberStyle } = initialDesignState;
    for (const hex of [colors.primary, colors.secondary, colors.accent, colors.collar, nameNumberStyle.fill, nameNumberStyle.outlineColor]) {
      expect(findPaletteColor(hex), hex).toBeDefined();
    }
  });

  it("has a CMYK for each color, written the way the panel shows it", () => {
    for (const { hex } of PALETTE) expect(formatCmyk(hex)).toMatch(/^C \d+ M \d+ Y \d+ K \d+$/);
  });

  it("finds a color whatever the case of the hexadecimal", () => {
    expect(findPaletteColor("#FFFFFF")?.name).toBe("Blanco");
    expect(findPaletteColor("#0A5C36")).toBe(findPaletteColor("#0a5c36"));
  });

  it("names a color by its name, and one that is not on the palette as another color", () => {
    expect(colorName("#0a5c36")).toBe("Verde");
    expect(colorName("#123456")).toBe(OTHER_COLOR_NAME);
    expect(OTHER_COLOR_NAME).toBe("Otro color");
  });

  it("keeps the names short enough for a swatch's tooltip and a phone's row", () => {
    for (const { name } of PALETTE) expect(name.length).toBeLessThanOrEqual(14);
  });
});
