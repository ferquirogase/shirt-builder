import { describe, it, expect, vi } from "vitest";
import { getNameNumberPreset, initialNameNumberStyle } from "@/lib/builder/catalog/name-number-presets";
import { drawStyledText, printableText } from "@/lib/builder/texture/number-text";

const preset = getNameNumberPreset;

describe("printableText", () => {
  it("drops accents, as shirts are printed, whatever the typeface", () => {
    expect(printableText("JOSÉ ÁLVAREZ GÜEMES", preset("bloque"))).toBe("JOSE ALVAREZ GUEMES");
    expect(printableText("RAMÍREZ", preset("angosta"))).toBe("RAMIREZ");
  });

  it("keeps the Ñ in a typeface that has one", () => {
    expect(printableText("MUÑOZ", preset("bloque"))).toBe("MUÑOZ");
    expect(printableText("MUÑOZ", preset("curva"))).toBe("MUÑOZ");
  });

  it("prints an N in a typeface without a Ñ, instead of a letter from another font", () => {
    for (const id of ["angosta", "retro", "fina", "ancha", "compacta"]) {
      expect(preset(id).hasEnye).toBe(false);
      expect(printableText("MUÑOZ", preset(id))).toBe("MUNOZ");
    }
  });

  it("drops the signs a typeface does not have; a hyphen becomes a space", () => {
    expect(printableText("O'NEIL", preset("cuadrada"))).toBe("ONEIL");
    expect(printableText("SAINT-MAXIMIN", preset("ancha"))).toBe("SAINT MAXIMIN");
    expect(printableText("J.R.", preset("ancha"))).toBe("JR");
    expect(printableText("O'NEIL", preset("bloque"))).toBe("O'NEIL");
  });

  it("leaves numbers alone", () => {
    expect(printableText("10", preset("ancha"))).toBe("10");
  });
});

describe("drawStyledText", () => {
  it("draws what the typeface can print", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
      measureText: () => ({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;
    drawStyledText(ctx, "MUÑOZ", 0, 0, {
      basePx: 50,
      maxWidth: 1000,
      style: initialNameNumberStyle(),
      preset: preset("angosta"),
      fontFamily: "sans-serif",
    });
    expect(ctx.fillText).toHaveBeenCalledWith("MUNOZ", 0, 0);
  });
});
