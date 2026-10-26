import { describe, it, expect, vi } from "vitest";
import { drawShortsToCanvas } from "@/lib/builder/texture/shorts-compositor";
import { initialDesignState } from "@/lib/builder/state/design-state";
import {
  SHORTS_CREST_BOX_FRACTION,
  SHORTS_CREST_STRETCH,
  SHORTS_FRONT_LAYOUT,
  SHORTS_NUMBER_FONT_FRACTION,
  SHORTS_UV_REGIONS,
  SHORTS_UV_STRETCH,
} from "@/lib/builder/geometry/shorts-uv-regions";
import { BRAND_BOX_FRACTION } from "@/lib/builder/texture/texture-compositor";
import { NUMBER_PLACEHOLDER } from "@/lib/builder/texture/number-text";

function createMockCtx() {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    // Width grows with the font size, like a real font: 0.6 px per character per px of size.
    measureText: vi.fn((text: string) => {
      const px = parseFloat(/([\d.]+)px/.exec(ctx.font)?.[1] ?? "10");
      return { width: text.length * px * 0.6 };
    }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineJoin: "miter",
    font: "",
    textAlign: "left",
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

const square = (id: string) => ({ id, naturalWidth: 100, naturalHeight: 100 }) as unknown as HTMLImageElement;
const entry = (scale = 1) => ({ dataUrl: "data:image/png;base64,AAAA", scale });
const kit = (sponsors: typeof initialDesignState.sponsors, playerName = "") => ({
  ...initialDesignState,
  playerName,
  shorts: { ...initialDesignState.shorts, included: true },
  sponsors,
});
const calls = (fn: unknown) => (fn as ReturnType<typeof vi.fn>).mock.calls;

describe("drawShortsToCanvas", () => {
  it("fills the whole canvas with the color of the shorts", () => {
    const ctx = createMockCtx();
    let paintedWith: unknown = null;
    (ctx.fillRect as ReturnType<typeof vi.fn>).mockImplementation(() => (paintedWith = ctx.fillStyle));
    drawShortsToCanvas(ctx, 1000, kit({}), "#123456", {});
    expect(calls(ctx.fillRect)[0]).toEqual([0, 0, 1000, 1000]);
    expect(paintedWith).toBe("#123456");
  });

  it("draws no image when there are no sponsors, no crest and no logo", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({}), "#123456", {});
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("draws the front sponsor on the player's right leg, upright, on the thigh", () => {
    const ctx = createMockCtx();
    const img = square("front");
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry() }), "#000", { sponsorImages: { "shorts-front-right": img } });
    expect(ctx.rotate).not.toHaveBeenCalled();
    // shortsFrontRight u .35..0.5, uFrac .4 -> u .41 -> x 410; v .035..0.592, vFrac .4 -> v .2578 -> y 742.
    const [tx, ty] = calls(ctx.translate)[0];
    expect(tx).toBeCloseTo(410, 5);
    expect(ty).toBeCloseTo(742.2, 1);
    const [, x, y, w, h] = calls(ctx.drawImage)[0];
    expect(w).toBeCloseTo(60, 5); // baseBox 0.06 of 1000, before the squeeze
    expect(h).toBeCloseTo(60, 5);
    expect(x).toBeCloseTo(-30, 5);
    expect(y).toBeCloseTo(-30, 5);
  });

  it("squeezes what it draws sideways, so it is not stretched on the shorts", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry() }), "#000", {
      sponsorImages: { "shorts-front-right": square("front") },
    });
    // The sponsor, and then the number (drawn squeezed too).
    expect(calls(ctx.scale)).toEqual([
      [SHORTS_UV_STRETCH, 1],
      [SHORTS_UV_STRETCH, 1],
    ]);
  });

  it("draws the back sponsors as they are, neither turned nor mirrored: the shorts' back reads upright from behind", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-back-left": entry(), "shorts-back-right": entry() }), "#000", {
      sponsorImages: { "shorts-back-left": square("bl"), "shorts-back-right": square("br") },
    });
    expect(ctx.rotate).not.toHaveBeenCalled();
    // The two sponsors, and then the number.
    expect(calls(ctx.scale)).toEqual([
      [SHORTS_UV_STRETCH, 1],
      [SHORTS_UV_STRETCH, 1],
      [SHORTS_UV_STRETCH, 1],
    ]);
    // shortsBackLeft u .72..0.88 -> x 800; shortsBackRight u .13..0.28 -> x 205 (both at the middle of the panel).
    const xs = calls(ctx.translate).map(([x]) => Math.round(x));
    expect(xs.slice(0, 2)).toEqual([800, 205]);
    // Both low on the leg, near the hem, below the front one (y 742): vFrac .14 -> v .113 -> y 887.
    const ys = calls(ctx.translate).map(([, y]) => Math.round(y));
    expect(ys.slice(0, 2)).toEqual([887, 887]);
  });

  it("draws a wide logo on the back across the leg, in a rectangle (0.105 x 0.04 of the canvas)", () => {
    const ctx = createMockCtx();
    const wide = { id: "w", naturalWidth: 400, naturalHeight: 100 } as unknown as HTMLImageElement;
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-back-left": entry() }), "#000", { sponsorImages: { "shorts-back-left": wide } });
    const [, , , w, h] = calls(ctx.drawImage)[0];
    expect(w).toBeCloseTo(105, 5);
    expect(h).toBeCloseTo(26.25, 5);
  });

  it("scales a sponsor with its scale, up to one and a half times", () => {
    const widthAt = (scale: number) => {
      const ctx = createMockCtx();
      drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry(scale) }), "#000", {
        sponsorImages: { "shorts-front-right": square("front") },
      });
      return calls(ctx.drawImage)[0][3];
    };
    expect(widthAt(1.5)).toBeCloseTo(90, 5);
    expect(widthAt(40)).toBeCloseTo(90, 5);
    expect(widthAt(0.5)).toBeCloseTo(30, 5);
  });

  it("does not draw a sponsor whose image has not loaded, or that has no entry", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry() }), "#000", {
      sponsorImages: { "shorts-front-right": null, "shorts-back-left": square("orphan") },
    });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("leaves the canvas state as it found it after each sponsor", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry(), "shorts-back-left": entry() }), "#000", {
      sponsorImages: { "shorts-front-right": square("f"), "shorts-back-left": square("b") },
    });
    expect(calls(ctx.save).length).toBe(calls(ctx.restore).length);
    // The two sponsors and the number.
    expect(calls(ctx.save).length).toBe(3);
  });

  it("does not draw the shirt's sponsors", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ abdomen: entry() }), "#000", { sponsorImages: { abdomen: square("shirt") } });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("does not draw a sponsor when the kit has no shorts", () => {
    const ctx = createMockCtx();
    const design = { ...kit({ "shorts-front-right": entry() }), shorts: { ...initialDesignState.shorts, included: false } };
    drawShortsToCanvas(ctx, 1000, design, "#000", { sponsorImages: { "shorts-front-right": square("f") } });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});

const brand = {
  brandLogoForLight: { id: "black", naturalWidth: 512, naturalHeight: 381 } as unknown as HTMLImageElement,
  brandLogoForDark: { id: "white", naturalWidth: 512, naturalHeight: 381 } as unknown as HTMLImageElement,
};
const crest = { id: "crest", naturalWidth: 100, naturalHeight: 100 } as unknown as HTMLImageElement;
const withNumber = (playerNumber: string) => ({ ...kit({}), playerNumber });
// Where a point of a region lands on a 1000px canvas (v is flipped).
const at = (region: keyof typeof SHORTS_UV_REGIONS, uFrac: number, vFrac: number) => {
  const r = SHORTS_UV_REGIONS[region];
  return { x: (r.u0 + uFrac * (r.u1 - r.u0)) * 1000, y: (1 - (r.v0 + vFrac * (r.v1 - r.v0))) * 1000 };
};

describe("the front of the shorts: number, maker's logo and crest", () => {
  const { number: numberAt, brand: brandAt, crest: crestAt } = SHORTS_FRONT_LAYOUT;

  it("writes the player's number on the front of the player's left leg, upright and squeezed like the rest", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, withNumber("10"), "#000", {});
    expect(calls(ctx.fillText)).toEqual([["10", 0, 0]]);
    const target = at(numberAt.region, numberAt.uFrac, numberAt.vFrac);
    const [tx, ty] = calls(ctx.translate)[0];
    expect(tx).toBeCloseTo(target.x, 5);
    expect(ty).toBeCloseTo(target.y, 5);
    expect(calls(ctx.scale)).toEqual([[SHORTS_UV_STRETCH, 1]]);
    expect(ctx.rotate).not.toHaveBeenCalled();
    expect(numberAt.region).toBe("shortsFrontLeft");
  });

  it("shows a 0 while the player has not typed a number, like the back", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, withNumber(""), "#000", {});
    expect(calls(ctx.fillText)).toEqual([[NUMBER_PLACEHOLDER, 0, 0]]);
  });

  it("draws it smaller than the one on the back, in the same style", () => {
    const ctx = createMockCtx();
    const fonts: string[] = [];
    (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
    drawShortsToCanvas(ctx, 1000, withNumber("10"), "#000", {}, "'Oswald', sans-serif");
    // classic: weight 700, scale 1.
    expect(fonts).toEqual([`700 ${1000 * SHORTS_NUMBER_FONT_FRACTION}px 'Oswald', sans-serif`]);
    expect(SHORTS_NUMBER_FONT_FRACTION).toBeLessThan(0.12);
  });

  it("fills with the style's fill color and outlines it when the style asks for it", () => {
    const ctx = createMockCtx();
    let fill = "";
    (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => (fill = ctx.fillStyle as string));
    const design = { ...withNumber("10"), nameNumberStyle: { ...initialDesignState.nameNumberStyle, fill: "#abcdef", outline: true } };
    drawShortsToCanvas(ctx, 1000, design, "#000", {});
    expect(fill).toBe("#abcdef");
    expect(ctx.strokeText).toHaveBeenCalledTimes(1);
  });

  it("draws the number's border in the color the style asks for", () => {
    const ctx = createMockCtx();
    let stroke: unknown = null;
    (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation(() => (stroke = ctx.strokeStyle));
    const design = { ...withNumber("10"), nameNumberStyle: { ...initialDesignState.nameNumberStyle, outline: true, outlineColor: "#ff00aa" } };
    drawShortsToCanvas(ctx, 1000, design, "#000", {});
    expect(stroke).toBe("#ff00aa");
  });

  it("puts the maker's logo under the number, white over dark cloth and black over light cloth", () => {
    const dark = createMockCtx();
    drawShortsToCanvas(dark, 1000, withNumber("10"), "#0a5c36", brand);
    expect(calls(dark.drawImage)).toHaveLength(1);
    expect(calls(dark.drawImage)[0][0]).toBe(brand.brandLogoForDark);

    const light = createMockCtx();
    drawShortsToCanvas(light, 1000, withNumber("10"), "#f5f0e0", brand);
    expect(calls(light.drawImage)[0][0]).toBe(brand.brandLogoForLight);
  });

  it("places the logo below the number, on the same leg, squeezed like the rest", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, withNumber("10"), "#000", brand);
    const target = at(brandAt.region, brandAt.uFrac, brandAt.vFrac);
    const numberTarget = at(numberAt.region, numberAt.uFrac, numberAt.vFrac);
    expect(brandAt.region).toBe(numberAt.region);
    // Lower on the leg is a larger y on the canvas.
    expect(target.y).toBeGreaterThan(numberTarget.y);
    const translates = calls(ctx.translate).map(([x, y]) => [Math.round(x), Math.round(y)]);
    expect(translates).toContainEqual([Math.round(target.x), Math.round(target.y)]);
    const [, x, y, w, h] = calls(ctx.drawImage)[0];
    expect(w).toBeCloseTo(1000 * BRAND_BOX_FRACTION, 5);
    expect(h).toBeCloseTo(1000 * BRAND_BOX_FRACTION * (381 / 512), 5);
    expect(x + w / 2).toBeCloseTo(0, 5);
    expect(y + h / 2).toBeCloseTo(0, 5);
  });

  it("keeps the number close above the logo: they read together, without touching", () => {
    const numberY = at(numberAt.region, numberAt.uFrac, numberAt.vFrac).y;
    const brandY = at(brandAt.region, brandAt.uFrac, brandAt.vFrac).y;
    // The number rests on its baseline, which is the point it is placed at: the digits are above it.
    // The logo is centered on its point and BRAND_BOX_FRACTION * 381/512 tall.
    const numberBottom = numberY;
    const logoTop = brandY - 1000 * BRAND_BOX_FRACTION * (381 / 512) * 0.5;
    const gap = logoTop - numberBottom;
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(15);
  });

  it("makes the number big enough to read on the leg: at least 8% of the canvas", () => {
    expect(SHORTS_NUMBER_FONT_FRACTION).toBeGreaterThanOrEqual(0.08);
  });

  it("draws the crest under sponsor 12, on the player's right leg", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({}), "#000", { logoImage: crest });
    const target = at(crestAt.region, crestAt.uFrac, crestAt.vFrac);
    const [tx, ty] = calls(ctx.translate)[0];
    expect(tx).toBeCloseTo(target.x, 5);
    expect(ty).toBeCloseTo(target.y, 5);
    const [img, x, y, w, h] = calls(ctx.drawImage)[0];
    expect(img).toBe(crest);
    expect(w).toBeCloseTo(1000 * SHORTS_CREST_BOX_FRACTION, 5);
    expect(h).toBeCloseTo(1000 * SHORTS_CREST_BOX_FRACTION, 5);
    expect(x + w / 2).toBeCloseTo(0, 5);
    expect(y + h / 2).toBeCloseTo(0, 5);
    expect(crestAt.region).toBe("shortsFrontRight");
    // Under sponsor 12 (its vFrac is the front sponsor's), in the same column.
    expect(crestAt.vFrac).toBeLessThan(0.4);
    expect(crestAt.uFrac).toBe(0.4);
  });

  it("keeps the crest clear of sponsor 12 even at its largest", () => {
    const front = SHORTS_UV_REGIONS.shortsFrontRight;
    const height = front.v1 - front.v0;
    const sponsorBottom = 0.4 - ((0.06 * 1.5) / 2) / height;
    const crestTop = crestAt.vFrac + (SHORTS_CREST_BOX_FRACTION / 2) / height;
    expect(crestTop).toBeLessThan(sponsorBottom);
  });

  it("squeezes the crest sideways by its own amount: the cloth by the crest is stretched more than the sponsors' zone", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({}), "#000", { logoImage: crest });
    expect(calls(ctx.scale)[0]).toEqual([SHORTS_CREST_STRETCH, 1]);
    expect(SHORTS_CREST_STRETCH).toBeLessThan(SHORTS_UV_STRETCH);
  });

  it("draws no crest when there is none, and no logo before it has loaded", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({}), "#000", { logoImage: null });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("draws none of it when the kit has no shorts", () => {
    const ctx = createMockCtx();
    const design = { ...withNumber("10"), shorts: { ...initialDesignState.shorts, included: false } };
    drawShortsToCanvas(ctx, 1000, design, "#000", { logoImage: crest, ...brand });
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("leaves the canvas state as it found it", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, withNumber("10"), "#000", { logoImage: crest, ...brand });
    expect(calls(ctx.save).length).toBe(calls(ctx.restore).length);
    expect(calls(ctx.save).length).toBeGreaterThanOrEqual(3);
  });
});
