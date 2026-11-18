import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PATTERN_EDGE_PAD, NAPE_BRAND_SQUEEZE_Y, drawDesignToCanvas } from "@/lib/builder/texture/texture-compositor";
import { NAME_PLACEHOLDER, NUMBER_PLACEHOLDER, displayName, displayNumber, showsNamePlaceholder } from "@/lib/builder/texture/number-text";
import { CHEST_NUMBER_FONT_FRACTION } from "@/lib/builder/texture/front-layout";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { NAME_V_FRAC, NUMBER_V_FRAC } from "@/lib/builder/texture/back-layout";
import { DEFAULT_PRESET_ID, OUTLINE_COLOR, OUTLINE_WIDTH, getNameNumberPreset } from "@/lib/builder/catalog/name-number-presets";

const DEFAULT_PRESET = getNameNumberPreset(DEFAULT_PRESET_ID);
// The size in a canvas font string ("400 120px ...").
const fontPx = (font: string) => parseFloat(/([\d.]+)px/.exec(font)![1]);
import { GEPE_UV_REGIONS, UV_FLIP_Y, type UVRegions, type UVRect } from "@/lib/builder/geometry/uv-regions";
import { findPattern } from "@/lib/builder/catalog/patterns";

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
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

const regions: UVRegions = {
  bodyFront: { u0: 0.3, v0: 0.5, u1: 0.7, v1: 0.9 },
  bodyBack: { u0: 0.3, v0: 0.1, u1: 0.7, v1: 0.5 },
  sleeveLeft: { u0: 0.05, v0: 0.1, u1: 0.25, v1: 0.4 },
  sleeveRight: { u0: 0.75, v0: 0.1, u1: 0.95, v1: 0.4 },
};

describe("drawDesignToCanvas", () => {
  it("fills the base color first", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
  });

  it("draws the body pattern in both front and back regions", () => {
    const ctx = createMockCtx();
    const fakeImage = {} as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: fakeImage, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
  });

  it("paints the collar mask over the whole atlas, after the patterns and before text", () => {
    const ctx = createMockCtx();
    const pattern = {} as HTMLImageElement;
    const mask = {} as HTMLCanvasElement;
    drawDesignToCanvas(
      ctx,
      1024,
      { ...initialDesignState, playerName: "ACME" },
      { bodyPatternImage: pattern, sleevePatternImage: null, logoImage: null, collarMaskImage: mask },
      regions
    );
    const draw = ctx.drawImage as ReturnType<typeof vi.fn>;
    expect(draw).toHaveBeenLastCalledWith(mask, 0, 0, 1024, 1024);
    const text = (ctx.fillText as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(draw.mock.invocationCallOrder.at(-1)!).toBeLessThan(text);
  });

  it("draws no collar mask when none is given", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("writes the player number when set", () => {
    const ctx = createMockCtx();
    const design = { ...initialDesignState, playerNumber: "10" };
    drawDesignToCanvas(
      ctx,
      1024,
      design,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.fillText).toHaveBeenCalledWith("10", expect.any(Number), expect.any(Number));
  });

  it("shows an example name and number while the player has typed none, so the design reads from the start", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([NAME_PLACEHOLDER, NUMBER_PLACEHOLDER]);
    expect([NAME_PLACEHOLDER, NUMBER_PLACEHOLDER]).toEqual(["NOMBRE", "10"]);
  });

  it("writes the typed number instead of the example once there is one", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(ctx, 1024, { ...initialDesignState, playerNumber: "7" }, { bodyPatternImage: null, sleevePatternImage: null, logoImage: null }, regions);
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([NAME_PLACEHOLDER, "7"]);
  });

  it("does not treat a blank number as typed", () => {
    expect(displayNumber({ playerNumber: "" })).toBe(NUMBER_PLACEHOLDER);
    expect(displayNumber({ playerNumber: "  " })).toBe(NUMBER_PLACEHOLDER);
    expect(displayNumber({ playerNumber: "7" })).toBe("7");
  });

  it("does not treat a blank name as typed, and keeps what was typed", () => {
    expect(displayName({ playerName: "" })).toBe(NAME_PLACEHOLDER);
    expect(displayName({ playerName: "   " })).toBe(NAME_PLACEHOLDER);
    expect(displayName({ playerName: "PEREZ" })).toBe("PEREZ");
  });

  it("shows the example name only while there is no name and the sponsor of the upper back is free", () => {
    const entry = { dataUrl: "data:image/png;base64,AAAA", scale: 1 };
    expect(showsNamePlaceholder({ playerName: "", sponsors: {} })).toBe(true);
    expect(showsNamePlaceholder({ playerName: "  ", sponsors: {} })).toBe(true);
    // Typed: it is the name that shows, not the example.
    expect(showsNamePlaceholder({ playerName: "PEREZ", sponsors: {} })).toBe(false);
    // The sponsor of the upper back is printed on the same strip: the example makes way for it.
    expect(showsNamePlaceholder({ playerName: "", sponsors: { "upper-back": entry } })).toBe(false);
    // A sponsor elsewhere does not matter.
    expect(showsNamePlaceholder({ playerName: "", sponsors: { "lower-back": entry } })).toBe(true);
  });

  it("writes the example name in the style of the name, upside-down like the back", () => {
    const ctx = createMockCtx();
    const rotations: unknown[] = [];
    (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation((text: string) => rotations.push([text, (ctx.rotate as ReturnType<typeof vi.fn>).mock.calls.length]));
    drawDesignToCanvas(ctx, 1000, initialDesignState, { bodyPatternImage: null, sleevePatternImage: null, logoImage: null }, regions);
    // The name was turned (one rotate) when it was written, and the number too (two).
    expect(rotations).toEqual([[NAME_PLACEHOLDER, 1], [NUMBER_PLACEHOLDER, 2]]);
  });

  it("makes way for the sponsor of the upper back instead of overlapping it", () => {
    const ctx = createMockCtx();
    const design = { ...initialDesignState, sponsors: { "upper-back": { dataUrl: "data:image/png;base64,AAAA", scale: 1 } } };
    drawDesignToCanvas(ctx, 1000, design, { bodyPatternImage: null, sleevePatternImage: null, logoImage: null }, regions);
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([NUMBER_PLACEHOLDER]);
  });

  it("writes the typed name instead of the example", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(ctx, 1000, { ...initialDesignState, playerName: "PEREZ" }, { bodyPatternImage: null, sleevePatternImage: null, logoImage: null }, regions);
    expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["PEREZ", NUMBER_PLACEHOLDER]);
  });

  it("converts a UV rect to exact canvas pixels, applying UV_FLIP_Y", () => {
    // Sanity check on the fixture value this whole test depends on: the
    // compositor must apply the real UV_FLIP_Y (currently true), not a
    // locally-assumed one, or this test would pass for the wrong reason.
    expect(UV_FLIP_Y).toBe(true);

    const ctx = createMockCtx();
    const fakeImage = {} as HTMLImageElement;
    const canvasSize = 1000;

    // A simple rect: u:[0.25,0.75], v:[0.5,1.0].
    // With UV_FLIP_Y=true, vToY(v) = 1 - v, so:
    //   vToY(v0=0.5) = 0.5 -> y fraction 0.5
    //   vToY(v1=1.0) = 0.0 -> y fraction 0.0
    // The canvas-space top/bottom are the min/max of those (0.0 and 0.5),
    // so the rect occupies canvas y in [0, 500] (not [500, 1000] -- that
    // would be the bug this test guards against, i.e. no flip applied).
    const bodyFront: UVRect = { u0: 0.25, v0: 0.5, u1: 0.75, v1: 1.0 };
    const testRegions: UVRegions = {
      bodyFront,
      // Use a distinct rect for bodyBack so its own drawImage call (also
      // triggered by a body pattern image) doesn't collide with the
      // assertion below; sleeves are left unused (no sleeve image passed).
      bodyBack: { u0: 0.1, v0: 0.1, u1: 0.2, v1: 0.2 },
      sleeveLeft: { u0: 0, v0: 0, u1: 0.1, v1: 0.1 },
      sleeveRight: { u0: 0.9, v0: 0, u1: 1.0, v1: 0.1 },
    };

    drawDesignToCanvas(
      ctx,
      canvasSize,
      initialDesignState,
      { bodyPatternImage: fakeImage, sleevePatternImage: null, logoImage: null },
      testRegions
    );

    const expectedX = 0.25 * canvasSize; // 250
    const expectedY = 0; // min(vToY(0.5), vToY(1.0)) * canvasSize
    const expectedWidth = 0.5 * canvasSize; // 500
    const expectedHeight = 0.5 * canvasSize; // 500 (max - min of the flipped y's)

    // The body pattern is drawn to bodyFront first, then bodyBack.
    expect(ctx.drawImage).toHaveBeenNthCalledWith(
      1,
      fakeImage,
      expectedX,
      expectedY,
      expectedWidth,
      expectedHeight
    );
  });

  it("keeps every real GEPE_UV_REGIONS rect within the measured UV island", () => {
    // Measured from public/models/gepe_shirt.obj (see uv-regions.ts): body and
    // sleeves together span u in [0.242, 0.758], v in [0.058, 0.98].
    const uMin = 0.242;
    const uMax = 0.758;
    const vMin = 0.058;
    const vMax = 0.98;
    const tolerance = 0.005;

    const { bodyFront, bodyBack, sleeveLeft, sleeveRight } = GEPE_UV_REGIONS;
    const allRects: UVRect[] = [bodyFront, bodyBack, sleeveLeft, sleeveRight];
    for (const rect of allRects) {
      expect(rect.u0).toBeGreaterThanOrEqual(uMin - tolerance);
      expect(rect.u1).toBeLessThanOrEqual(uMax + tolerance);
      expect(rect.v0).toBeGreaterThanOrEqual(vMin - tolerance);
      expect(rect.v1).toBeLessThanOrEqual(vMax + tolerance);
    }
  });

  // The OBJ's back UV island is rotated 180deg relative to the front: on the
  // back, v decreases going up the shirt and u runs right-to-left as seen
  // from behind. Anything drawn upright into bodyBack therefore shows
  // upside-down on the model, so back content is drawn rotated by PI.
  describe("back panel orientation", () => {
    const blank = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };

    it("rotates the player name 180deg around its own anchor", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, { ...initialDesignState, playerName: "PEREZ" }, blank, regions);

      const rotate = ctx.rotate as ReturnType<typeof vi.fn>;
      const fillText = ctx.fillText as ReturnType<typeof vi.fn>;
      expect(rotate).toHaveBeenCalledWith(Math.PI);
      expect(rotate.mock.invocationCallOrder[0]).toBeLessThan(fillText.mock.invocationCallOrder[0]);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("rotates the player number 180deg", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, { ...initialDesignState, playerNumber: "10" }, blank, regions);
      expect(ctx.rotate).toHaveBeenCalledWith(Math.PI);
    });

    it("draws the back body pattern rotated 180deg around the region center, front unrotated", () => {
      const ctx = createMockCtx();
      const fakeImage = {} as HTMLImageElement;
      drawDesignToCanvas(
        ctx,
        1000,
        initialDesignState,
        { bodyPatternImage: fakeImage, sleevePatternImage: null, logoImage: null },
        regions
      );

      // Front: drawn plainly.
      const draws = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls;
      const [, fx, fy, fw, fh] = draws[0];
      expect([fx, fy, fw, fh].map((n) => Math.round(n))).toEqual([300, 100, 400, 400]);
      // Back (v 0.1..0.5 -> canvas y 500..900, center 500,700): rotated about its center.
      // The pattern, and then the example name and number, which are turned like the back too.
      expect(ctx.rotate).toHaveBeenCalledTimes(3);
      expect(ctx.rotate).toHaveBeenCalledWith(Math.PI);
      const [tx, ty] = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect([Math.round(tx), Math.round(ty)]).toEqual([500, 700]);
      const [, bx, by, bw, bh] = draws[1];
      expect([bx, by, bw, bh].map((n) => Math.round(n))).toEqual([-200, -200, 400, 400]);
    });
  });

  describe("name and number style", () => {
    const blank = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };
    const withStyle = (patch: Partial<typeof initialDesignState>) => ({ ...initialDesignState, ...patch });

    it("uses the preset's weight and the given font family, scaled by the base size", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10" }), blank, regions, "'Oswald', sans-serif");
      // Number base 0.135 * 1000 = 135px, times the typeface's scale.
      // The example name comes first (0.05 * 1000 = 50px); the number is the last text.
      expect(fonts.at(-1)).toMatch(new RegExp(`^${DEFAULT_PRESET.weight} [\\d.]+px 'Oswald', sans-serif$`));
      expect(fontPx(fonts.at(-1)!)).toBeCloseTo(135 * DEFAULT_PRESET.numberScale, 5);
    });

    it("fills with the style's fill color", () => {
      const ctx = createMockCtx();
      let fill = "";
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => (fill = ctx.fillStyle as string));
      const design = withStyle({
        playerNumber: "7",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, fill: "#f5d77a" },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      expect(fill).toBe("#f5d77a");
    });

    it("does not stroke when the border is off (Review Focus 5)", () => {
      const ctx = createMockCtx();
      const off = { ...initialDesignState.nameNumberStyle, outline: false };
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10", playerName: "PEREZ", nameNumberStyle: off }), blank, regions);
      expect(ctx.strokeText).not.toHaveBeenCalled();
    });

    it("with the border on, strokes in black before filling, with a round join", () => {
      const ctx = createMockCtx();
      const seen: Record<string, unknown> = {};
      (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation(() => {
        seen.strokeStyle = ctx.strokeStyle;
        seen.lineWidth = ctx.lineWidth;
        seen.lineJoin = ctx.lineJoin;
      });
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, outline: true },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      const stroke = (ctx.strokeText as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      const fill = (ctx.fillText as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      expect(stroke).toBeLessThan(fill);
      expect(seen.strokeStyle).toBe(OUTLINE_COLOR);
      expect(seen.lineJoin).toBe("round");
      // Strokes are centered on the glyph edge, so the line is twice the visible border.
      // Number size: 0.135 * 1000 = 135px, times the typeface's scale.
      expect(seen.lineWidth).toBeCloseTo(135 * DEFAULT_PRESET.numberScale * OUTLINE_WIDTH * 2, 5);
    });

    it("draws the border in the color the style asks for", () => {
      const ctx = createMockCtx();
      const strokes: unknown[] = [];
      (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation(() => strokes.push(ctx.strokeStyle));
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, outline: true, outlineColor: "#ff00aa" },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      expect(strokes.length).toBeGreaterThan(0);
      expect(strokes.every((c) => c === "#ff00aa")).toBe(true);
    });

    it("falls back to the black border for a design saved before the border had a color", () => {
      const ctx = createMockCtx();
      let stroke: unknown = null;
      (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation(() => (stroke = ctx.strokeStyle));
      const old: Partial<typeof initialDesignState.nameNumberStyle> = { ...initialDesignState.nameNumberStyle, outline: true };
      delete old.outlineColor;
      const design = withStyle({ playerNumber: "10", nameNumberStyle: old as typeof initialDesignState.nameNumberStyle });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      expect(stroke).toBe(OUTLINE_COLOR);
    });

    it("draws a black border around the number and the name from the start, with no setting touched", () => {
      const ctx = createMockCtx();
      const strokes: unknown[] = [];
      (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation((text: string) => strokes.push([text, ctx.strokeStyle]));
      drawDesignToCanvas(ctx, 1000, { ...initialDesignState, playerName: "PEREZ", playerNumber: "10" }, blank, regions);
      expect(strokes).toEqual([
        ["PEREZ", "#000000"],
        ["10", "#000000"],
      ]);
    });

    it("draws no border when it is switched off", () => {
      const ctx = createMockCtx();
      const design = withStyle({ playerNumber: "10", nameNumberStyle: { ...initialDesignState.nameNumberStyle, outline: false } });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      expect(ctx.strokeText).not.toHaveBeenCalled();
    });

    it("never draws a shadow", () => {
      const ctx = createMockCtx();
      const design = withStyle({
        playerNumber: "10",
        playerName: "PEREZ",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, outline: true },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      expect(ctx.shadowColor).toBe("transparent");
      expect(ctx.shadowBlur).toBe(0);
      expect(ctx.shadowOffsetY).toBe(0);
    });

    it("shrinks a very long name to fit 80% of the back panel width (Review Focus 1)", () => {
      const ctx = createMockCtx();
      let widthAtDraw = 0;
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
        // Only the name: the 0 of the number is drawn too.
        if (text.length > 2) widthAtDraw = ctx.measureText(text).width;
      });
      const longName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      drawDesignToCanvas(ctx, 1000, withStyle({ playerName: longName }), blank, regions);
      // bodyBack is 0.4 wide -> 400px; 80% -> 320px.
      expect(widthAtDraw).toBeLessThanOrEqual(320.01);
      expect(widthAtDraw).toBeGreaterThan(300);
    });

    it("uses the model's own back text width when the regions define one", () => {
      const ctx = createMockCtx();
      let widthAtDraw = 0;
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
        // Only the name: the 0 of the number is drawn too.
        if (text.length > 2) widthAtDraw = ctx.measureText(text).width;
      });
      // bodyBack is 400px wide here; the garment's real back is only half of that rect.
      const narrow: UVRegions = { ...regions, backTextWidthFraction: 0.5 };
      drawDesignToCanvas(ctx, 1000, withStyle({ playerName: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" }), blank, narrow);
      expect(widthAtDraw).toBeLessThanOrEqual(200.01);
      expect(widthAtDraw).toBeGreaterThan(190);
    });

    it("keeps the real GEPE jersey's back text inside the measured back panel", () => {
      // Measured on public/models/gepe_shirt.obj: the back panel spans u 0.355..0.645
      // (0.29 wide) at the name and number rows, much narrower than the 0.408 bodyBack rect.
      const { bodyBack, backTextWidthFraction } = GEPE_UV_REGIONS;
      const textWidthUv = (bodyBack.u1 - bodyBack.u0) * (backTextWidthFraction ?? 0.8);
      expect(textWidthUv).toBeLessThanOrEqual(0.29 * 0.75);
    });

    it("anchors the name at the shared back-layout position, clear of the collar", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withStyle({ playerName: "LEO" }), blank, regions);
      const [, ty] = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(ty).toBeCloseTo((1 - (0.1 + NAME_V_FRAC * 0.4)) * 1000, 5);
    });

    it("does not shrink a short name", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      drawDesignToCanvas(ctx, 1000, withStyle({ playerName: "LEO" }), blank, regions);
      // Name base 0.05 * 1000 = 50px, times the typeface's scale.
      expect(fontPx(fonts[0])).toBeCloseTo(50 * DEFAULT_PRESET.nameScale, 5);
    });

    it("falls back to the default preset for an unknown preset id (Review Focus 2)", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, presetId: "gone" },
      });
      expect(() => drawDesignToCanvas(ctx, 1000, design, blank, regions)).not.toThrow();
      expect(fontPx(fonts.at(-1)!)).toBeCloseTo(135 * DEFAULT_PRESET.numberScale, 5);
    });
  });

  // The two sleeve UV islands are mirror images across the island's vertical
  // axis: the sleeveRight island (-x side of the model) runs cuff-to-shoulder
  // in the opposite u direction from sleeveLeft, so a directional sleeve
  // pattern (e.g. a cuff band) must be drawn mirrored there or it lands at
  // the shoulder instead of the cuff.
  describe("the torso pattern's edges", () => {
    // The texture is filtered: a texel at a panel's edge is mixed with the ones beside it, so whatever is
    // painted past the edge shows as a line along the side seams. The pattern's own edge is stretched out
    // there, except at the shoulder, where the front and the back panels touch.
    const image = { naturalWidth: 512, naturalHeight: 512 } as HTMLImageElement;
    const draws = () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 2048, initialDesignState, { bodyPatternImage: image, sleevePatternImage: null, logoImage: null }, GEPE_UV_REGIONS);
      return (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === image);
    };

    it("stretches the left and right edge columns and the bottom row of front and back outwards", () => {
      const strips = draws().filter((c) => c.length === 9);
      const pad = PATTERN_EDGE_PAD * 2048;
      // Per panel: the first column, the last column and the last row of the image.
      const sources = strips.map((c) => c.slice(1, 5));
      expect(sources).toEqual([
        [0, 0, 1, 512],
        [511, 0, 1, 512],
        [0, 511, 512, 1],
        [0, 0, 1, 512],
        [511, 0, 1, 512],
        [0, 511, 512, 1],
      ]);
      for (const c of strips.slice(0, 2)) expect(c[7]).toBeCloseTo(pad);
      expect(strips[2][8]).toBeCloseTo(pad);
    });

    it("never stretches the top row, at the shoulder seam", () => {
      expect(draws().some((c) => c.length === 9 && c[2] === 0 && c[4] === 1)).toBe(false);
    });

    it("draws the strips under the panel's image", () => {
      const calls = draws();
      expect(calls.slice(0, 4).map((c) => c.length)).toEqual([9, 9, 9, 5]);
    });
  });

  describe("sleeve orientation", () => {
    it("draws the left sleeve plainly and mirrors the right sleeve horizontally", () => {
      const ctx = createMockCtx();
      const fakeImage = {} as HTMLImageElement;
      drawDesignToCanvas(
        ctx,
        1000,
        initialDesignState,
        { bodyPatternImage: null, sleevePatternImage: fakeImage, logoImage: null },
        regions
      );

      const draws = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls;
      expect(draws).toHaveLength(2);
      // sleeveLeft (u .05..0.25, v .1..0.4 -> x 50, y 600, 200x300): plain.
      const [, lx, ly, lw, lh] = draws[0];
      expect([lx, ly, lw, lh].map((n) => Math.round(n))).toEqual([50, 600, 200, 300]);
      // sleeveRight (u .75..0.95 -> x 750, center 850,750): mirrored about its center.
      expect(ctx.scale).toHaveBeenCalledTimes(1);
      expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
      const [tx, ty] = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect([Math.round(tx), Math.round(ty)]).toEqual([850, 750]);
      const [, rx, ry, rw, rh] = draws[1];
      expect([rx, ry, rw, rh].map((n) => Math.round(n))).toEqual([-100, -150, 200, 300]);
    });

    it("does not mirror anything when no sleeve pattern is set", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(
        ctx,
        1000,
        initialDesignState,
        { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
        regions
      );
      expect(ctx.scale).not.toHaveBeenCalled();
    });
  });

  it("draws a non-square logo preserving its aspect ratio", () => {
    const ctx = createMockCtx();
    const wideLogo = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: wideLogo },
      regions
    );

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
    const [, , , width, height] = call;
    // 2:1 aspect ratio should be preserved, not squashed into a square.
    expect(width / height).toBeCloseTo(2, 5);
  });

  it("centers the crest on the wearer's left chest, not on a shoulder", () => {
    const ctx = createMockCtx();
    const logo = { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1000,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: logo },
      regions
    );
    // bodyFront u .3..0.7, v .5..0.9. Chest point: 0.66 across (toward the viewer's right,
    // since u grows with model x) and 0.71 up from the hem:
    //   u = 0.3 + 0.66 * 0.4 = 0.564 -> x 564;  v = 0.5 + 0.71 * 0.4 = 0.784 -> y 216.
    // The crest box is 52px (5.2% of the canvas), centered there.
    const [, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(w).toBeCloseTo(52, 5);
    expect(h).toBeCloseTo(52, 5);
    expect(x + w / 2).toBeCloseTo(564, 5);
    expect(y + h / 2).toBeCloseTo(216, 5);
  });

  it("centers a wide crest on the same point", () => {
    const ctx = createMockCtx();
    const wide = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1000,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: wide },
      regions
    );
    const [, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(x + w / 2).toBeCloseTo(564, 5);
    expect(y + h / 2).toBeCloseTo(216, 5);
  });

  describe("brand logo", () => {
    const forLight = { id: "black", naturalWidth: 512, naturalHeight: 381 } as unknown as HTMLImageElement;
    const forDark = { id: "white", naturalWidth: 512, naturalHeight: 381 } as unknown as HTMLImageElement;
    const brand = { brandLogoForLight: forLight, brandLogoForDark: forDark };
    const base = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };

    // A canvas whose pixels under any requested rect are a single color.
    function ctxWithPixels(r: number, g: number, b: number) {
      const ctx = createMockCtx();
      (ctx as unknown as { getImageData: unknown }).getImageData = vi.fn((_x: number, _y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
        return { data };
      });
      return ctx;
    }
    const drawnImages = (ctx: CanvasRenderingContext2D) =>
      (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);

    it("is centered on the right chest at the crest's height, smaller than the crest", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
      const [img, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(img).toBe(forDark);
      // bodyFront u .3..0.7, v .5..0.9: 0.30 across -> u 0.42 -> x 420; same height as the crest, y 216.
      // Smaller than the crest (52px): a maker's mark is 2.1% of the canvas (it was 3%).
      expect(w).toBeCloseTo(21, 5);
      expect(h).toBeCloseTo(21 * (381 / 512), 5);
      expect(x + w / 2).toBeCloseTo(420, 5);
      expect(y + h / 2).toBeCloseTo(216, 5);
    });

    describe("where the model and the molde say", () => {
      const placed: UVRegions = { ...regions, brandLogoAt: { u: 0.45, v: 0.82 } };

      it("goes on the model's own spot when the design has none (the plain shirt)", () => {
        const ctx = ctxWithPixels(0, 0, 0);
        drawDesignToCanvas(ctx, 1000, { ...initialDesignState, bodyPatternId: "plain-body" }, { ...base, ...brand }, placed);
        const [, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
        // u 0.45 -> x 450; v 0.82 -> y (flipped) 180.
        expect(x + w / 2).toBeCloseTo(450, 5);
        expect(y + h / 2).toBeCloseTo(180, 5);
      });

      it("goes where the chosen molde puts it", () => {
        const ctx = ctxWithPixels(0, 0, 0);
        const at = findPattern("molde-04")!.brandLogoAt!;
        drawDesignToCanvas(ctx, 1000, { ...initialDesignState, bodyPatternId: "molde-04" }, { ...base, ...brand }, placed);
        const [, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(x + w / 2).toBeCloseTo(at.u * 1000, 5);
        expect(y + h / 2).toBeCloseTo((1 - at.v) * 1000, 5);
      });

      it("raises the crest to the model's logo height, keeping it on the other chest", () => {
        const ctx = ctxWithPixels(0, 0, 0);
        const crest = { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
        drawDesignToCanvas(ctx, 1000, { ...initialDesignState, bodyPatternId: "molde-04" }, { ...base, ...brand, logoImage: crest }, placed);
        const [img, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(img).toBe(crest);
        // Across as before (0.66 of bodyFront -> x 564), up at the model's common logo height (v 0.82 -> y 180).
        expect(x + w / 2).toBeCloseTo(564, 5);
        expect(y + h / 2).toBeCloseTo(180, 5);
      });

      it("on the real shirt, sits more to the middle and higher than it used to, where the PDF has it", () => {
        const at = GEPE_UV_REGIONS.brandLogoAt!;
        // It was 0.30 across bodyFront (u 0.4321) and 0.71 up (v 0.379).
        expect(at.u).toBeGreaterThan(0.44);
        expect(at.u).toBeLessThan(0.5);
        expect(at.v).toBeGreaterThan(0.4);
        expect(at.v).toBeLessThan(0.42);
      });
    });

    it("is always drawn, with or without a crest, and does not move when a crest is set", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      const crest = { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand, logoImage: crest }, regions);
      expect(drawnImages(ctx)).toEqual([crest, forDark, forDark]);
      const [, x, , w] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(x + w / 2).toBeCloseTo(420, 5);
    });

    it("uses the version for dark backgrounds over dark pixels", () => {
      const ctx = ctxWithPixels(10, 90, 50);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
      expect(drawnImages(ctx)).toEqual([forDark, forDark]);
    });

    it("uses the version for light backgrounds over light pixels", () => {
      const ctx = ctxWithPixels(250, 250, 250);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
      expect(drawnImages(ctx)).toEqual([forLight, forLight]);
    });

    it("samples the pixels under the logo, after the patterns are painted", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, bodyPatternImage: {} as HTMLImageElement, ...brand }, regions);
      const sample = (ctx as unknown as { getImageData: ReturnType<typeof vi.fn> }).getImageData;
      const patternDraws = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.invocationCallOrder;
      // One sample for the chest logo and one for the nape logo, each just before its own draw.
      expect(sample).toHaveBeenCalledTimes(2);
      expect(sample.mock.invocationCallOrder[0]).toBeGreaterThan(patternDraws[1]);
      expect(sample.mock.invocationCallOrder[0]).toBeLessThan(patternDraws[2]);
      expect(sample.mock.invocationCallOrder[1]).toBeGreaterThan(patternDraws[2]);
      expect(sample.mock.invocationCallOrder[1]).toBeLessThan(patternDraws[3]);
    });

    it("falls back to the primary color when pixels can't be read (no getImageData)", () => {
      const dark = createMockCtx();
      drawDesignToCanvas(dark, 1000, initialDesignState, { ...base, ...brand }, regions); // primary #0a5c36 is dark
      expect(drawnImages(dark)).toEqual([forDark, forDark]);

      const light = createMockCtx();
      const pale = { ...initialDesignState, colors: { ...initialDesignState.colors, primary: "#f5f0e0" } };
      drawDesignToCanvas(light, 1000, pale, { ...base, ...brand }, regions);
      expect(drawnImages(light)).toEqual([forLight, forLight]);
    });

    it("falls back to the primary color when reading pixels throws (tainted canvas)", () => {
      const ctx = createMockCtx();
      (ctx as unknown as { getImageData: unknown }).getImageData = vi.fn(() => {
        throw new Error("SecurityError");
      });
      expect(() => drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions)).not.toThrow();
      expect(drawnImages(ctx)).toEqual([forDark, forDark]);
    });

    it("uses the other version when the preferred one is missing", () => {
      const ctx = ctxWithPixels(0, 0, 0); // dark -> prefers forDark, which is missing
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, brandLogoForLight: forLight, brandLogoForDark: null }, regions);
      expect(drawnImages(ctx)).toEqual([forLight, forLight]);
    });

    describe("on the back of the neck", () => {
      it("sits at the nape, in the middle of the back, turned half a turn like the rest of the back", () => {
        const ctx = ctxWithPixels(0, 0, 0);
        drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
        // The logo at the nape, then the example name and number, all turned like the back.
        expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[Math.PI], [Math.PI], [Math.PI]]);
        // bodyBack u .3..0.7 -> x 500; NAPE_V_FRAC 0.10 -> v 0.1+0.10*0.4=0.14 -> y 860.
        const [tx, ty] = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(tx).toBeCloseTo(500, 5);
        expect(ty).toBeCloseTo(860, 5);
        const [img, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[1];
        expect(img).toBe(forDark);
        // 2.2% of the canvas, about as big as the logo on the chest (21px). Centered on the translated point.
        expect(w).toBeCloseTo(22, 5);
        expect(h).toBeCloseTo(22 * (381 / 512), 5);
        // Made shorter on the canvas, because the collar stretches the cloth upwards there.
        expect((ctx.scale as ReturnType<typeof vi.fn>).mock.calls).toEqual([[1, NAPE_BRAND_SQUEEZE_Y]]);
        const chestWidth = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0][3];
        expect(w).toBeLessThan(chestWidth * 1.1);
        expect(x + w / 2).toBeCloseTo(0, 5);
        expect(y + h / 2).toBeCloseTo(0, 5);
      });

      it("picks black or white by the cloth under the nape, not by the cloth on the chest", () => {
        // Dark on the chest (y < 500), light on the back where the nape is (y > 500).
        const ctx = createMockCtx();
        (ctx as unknown as { getImageData: unknown }).getImageData = vi.fn((_x: number, y: number, w: number, h: number) => {
          const data = new Uint8ClampedArray(w * h * 4);
          data.fill(y > 500 ? 250 : 10);
          return { data };
        });
        drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
        expect(drawnImages(ctx)).toEqual([forDark, forLight]);
      });

      it("is drawn before the sponsors, and leaves the canvas state as it found it", () => {
        const ctx = ctxWithPixels(0, 0, 0);
        const low = { id: "low", naturalWidth: 100, naturalHeight: 100 } as unknown as HTMLImageElement;
        drawDesignToCanvas(
          ctx,
          1000,
          { ...initialDesignState, sponsors: { "lower-back": { dataUrl: "data:image/png;base64,AAAA", scale: 1 } } },
          { ...base, ...brand, sponsorImages: { "lower-back": low } },
          regions
        );
        expect(drawnImages(ctx)).toEqual([forDark, forDark, low]);
        expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length);
      });
    });

    it("draws nothing when no brand logo has loaded yet", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      drawDesignToCanvas(ctx, 1000, initialDesignState, base, regions);
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });
  });

  // The two labels the owners' moldes carry: a tag low on the front, on the viewer's right, and a strip
  // low in the middle of the back. Their rects are where the PDF puts them, laid on the cloth like the
  // moldes (the image fills the rect, so it follows the cloth's stretch there).
  describe("brand labels", () => {
    const base = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };
    const front = { id: "front-label", naturalWidth: 425, naturalHeight: 213 } as unknown as HTMLImageElement;
    const back = { id: "back-label", naturalWidth: 496, naturalHeight: 35 } as unknown as HTMLImageElement;
    const labels = { frontLabelImage: front, backLabelImage: back };
    const labelled: UVRegions = {
      ...regions,
      frontLabel: { u0: 0.6, v0: 0.6, u1: 0.64, v1: 0.62 },
      backLabel: { u0: 0.48, v0: 0.4, u1: 0.52, v1: 0.403 },
    };
    const calls = (ctx: CanvasRenderingContext2D) => (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls;
    const callOf = (ctx: CanvasRenderingContext2D, image: HTMLImageElement) => calls(ctx).find((c) => c[0] === image)!;

    it("fills the model's front label rect with the front label, upright", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...labels }, labelled);
      // u .6..0.64 -> x 600..640; v .6..0.62 -> y (flipped) 380..400.
      const [, x, y, w, h] = callOf(ctx, front);
      expect(x).toBeCloseTo(600, 5);
      expect(y).toBeCloseTo(380, 5);
      expect(w).toBeCloseTo(40, 5);
      expect(h).toBeCloseTo(20, 5);
    });

    it("fills the back label rect with the back label, turned half a turn about its center like the rest of the back", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...labels }, labelled);
      const index = calls(ctx).findIndex((c) => c[0] === back);
      const [, x, y, w, h] = calls(ctx)[index];
      // u .48..0.52 -> x 480..520; v .4..0.403 -> y (flipped) 597..600: centered on (500, 598.5).
      expect(w).toBeCloseTo(40, 5);
      expect(h).toBeCloseTo(3, 5);
      expect(x + w / 2).toBeCloseTo(0, 5);
      expect(y + h / 2).toBeCloseTo(0, 5);
      const translate = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      const rotate = (ctx.rotate as ReturnType<typeof vi.fn>).mock.calls;
      expect(translate[0][0]).toBeCloseTo(500, 5);
      expect(translate[0][1]).toBeCloseTo(598.5, 5);
      expect(rotate[0]).toEqual([Math.PI]);
      expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length);
    });

    it("goes on every shirt, whatever its pattern, over the pattern and under the sponsors", () => {
      const pattern = { id: "pattern" } as unknown as HTMLImageElement;
      const low = { id: "low", naturalWidth: 100, naturalHeight: 100 } as unknown as HTMLImageElement;
      for (const bodyPatternId of ["plain-body", "molde-07"]) {
        const ctx = createMockCtx();
        drawDesignToCanvas(
          ctx,
          1000,
          { ...initialDesignState, bodyPatternId, sponsors: { "lower-back": { dataUrl: "data:image/png;base64,AAAA", scale: 1 } } },
          { ...base, ...labels, bodyPatternImage: pattern, sponsorImages: { "lower-back": low } },
          labelled
        );
        expect(calls(ctx).map((c) => c[0]).filter((i) => i !== pattern)).toEqual([front, back, low]);
        expect(calls(ctx).findIndex((c) => c[0] === pattern)).toBeLessThan(calls(ctx).findIndex((c) => c[0] === front));
      }
    });

    it("draws no label on a model without label rects, nor one that has not loaded", () => {
      const bare = createMockCtx();
      drawDesignToCanvas(bare, 1000, initialDesignState, { ...base, ...labels }, regions);
      expect(bare.drawImage).not.toHaveBeenCalled();
      const loading = createMockCtx();
      drawDesignToCanvas(loading, 1000, initialDesignState, { ...base, frontLabelImage: front }, labelled);
      expect(calls(loading).map((c) => c[0])).toEqual([front]);
    });

    it("sits on the real shirt where the moldes put it: front low on the viewer's right, back low in the middle", () => {
      const { frontLabel, backLabel, bodyFrontPattern, bodyBackPattern } = GEPE_UV_REGIONS;
      // Front: u grows toward the viewer's right; the hem is at v 0.0576, the armpit at 0.355.
      expect(frontLabel!.u0).toBeGreaterThan(0.5);
      expect(frontLabel!.u1).toBeLessThan(0.6768);
      // Centered in Franjas anchas' white stripe (u 0.5767..0.6284 at that height), clear of its edges.
      expect(frontLabel!.u0).toBeGreaterThan(0.5767 + 0.005);
      expect(frontLabel!.u1).toBeLessThan(0.6284 - 0.005);
      expect(frontLabel!.v0).toBeGreaterThan(0.0576);
      expect(frontLabel!.v1).toBeLessThan(0.2);
      // Its shape on the cloth stays close to the tag's 2:1 (the atlas is square, the cloth about as stretched).
      expect((frontLabel!.u1 - frontLabel!.u0) / (frontLabel!.v1 - frontLabel!.v0)).toBeGreaterThan(1.6);
      expect((frontLabel!.u1 - frontLabel!.u0) / (frontLabel!.v1 - frontLabel!.v0)).toBeLessThan(2.6);
      // Back: centered across, between the number's sponsor and the hem (v 0.942, the back turned).
      expect((backLabel!.u0 + backLabel!.u1) / 2).toBeCloseTo(0.5, 2);
      expect(backLabel!.v0).toBeGreaterThan(0.85);
      expect(backLabel!.v1).toBeLessThan(0.942);
      for (const [label, cloth] of [
        [frontLabel!, bodyFrontPattern!],
        [backLabel!, bodyBackPattern!],
      ]) {
        expect(label.u0).toBeGreaterThan(cloth.u0);
        expect(label.u1).toBeLessThan(cloth.u1);
        expect(label.v0).toBeGreaterThan(cloth.v0);
        expect(label.v1).toBeLessThan(cloth.v1);
      }
    });
  });

  describe("sponsors", () => {
    const base = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };
    const square = (id: string) => ({ id, naturalWidth: 100, naturalHeight: 100 }) as unknown as HTMLImageElement;
    const designWith = (sponsors: typeof initialDesignState.sponsors) => ({ ...initialDesignState, sponsors });
    const entry = (scale = 1) => ({ dataUrl: "data:image/png;base64,AAAA", scale });

    // The sponsor is drawn after translate(center)+rotate: its box is centered on (0,0).
    function drawn(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
      const calls = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls;
      const index = calls.findIndex((c) => c[0] === image);
      const [, x, y, w, h] = calls[index];
      const translate = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      const rotate = (ctx.rotate as ReturnType<typeof vi.fn>).mock.calls;
      return { x, y, w, h, translate, rotate };
    }

    it("draws the front sponsor centered on the chest at its base size, unrotated", () => {
      const ctx = createMockCtx();
      const img = square("abdomen");
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: img } }, regions);
      const { x, y, w, h, translate, rotate } = drawn(ctx, img);
      // bodyFront u .3..0.7 -> center u 0.5 -> x 500; v .5..0.9, vFrac 0.63 -> v 0.752 -> y 248.
      expect(translate[0][0]).toBeCloseTo(500, 5);
      expect(translate[0][1]).toBeCloseTo(248, 5);
      expect(rotate.slice(0, -2)).toHaveLength(0); // the last two turns are the example name and number
      expect(w).toBeCloseTo(50, 5); // baseBox 0.05 of 1000
      expect(h).toBeCloseTo(50, 5);
      expect(x).toBeCloseTo(-25, 5); // centered on the translated origin
      expect(y).toBeCloseTo(-25, 5);
    });

    it("scales the size with the placement's scale", () => {
      const ctx = createMockCtx();
      const img = square("abdomen");
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry(1.5) }), { ...base, sponsorImages: { abdomen: img } }, regions);
      expect(drawn(ctx, img).w).toBeCloseTo(75, 5);
    });

    it("limits a scale outside 0.5..1.5 and treats NaN as 1 (Review Focus 1)", () => {
      const sizeAt = (scale: number) => {
        const ctx = createMockCtx();
        const img = square("abdomen");
        drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry(scale) }), { ...base, sponsorImages: { abdomen: img } }, regions);
        return drawn(ctx, img).w;
      };
      expect(sizeAt(40)).toBeCloseTo(75, 5);
      expect(sizeAt(0)).toBeCloseTo(25, 5);
      expect(sizeAt(Number.NaN)).toBeCloseTo(50, 5);
    });

    it("fits a tall or square image inside the rectangle by its height, so stacked placements never touch", () => {
      const ctx = createMockCtx();
      const tall = { id: "t", naturalWidth: 100, naturalHeight: 400 } as unknown as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: tall } }, regions);
      const { w, h } = drawn(ctx, tall);
      expect(h).toBeCloseTo(50, 5);
      expect(w).toBeCloseTo(12.5, 5);
    });

    it("keeps a wide image's proportions", () => {
      const ctx = createMockCtx();
      const wide = { id: "w", naturalWidth: 400, naturalHeight: 100 } as unknown as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: wide } }, regions);
      const { w, h } = drawn(ctx, wide);
      // The chest placement is a wide rectangle (0.12 x 0.05 of the canvas): a banner uses all its width.
      expect(w).toBeCloseTo(120, 5);
      expect(h).toBeCloseTo(30, 5);
    });

    it("draws an SVG with no natural size as a square instead of failing (Review Focus 3)", () => {
      const ctx = createMockCtx();
      const svg = { id: "svg", naturalWidth: 0, naturalHeight: 0 } as unknown as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: svg } }, regions);
      const { w, h } = drawn(ctx, svg);
      expect(w).toBeCloseTo(50, 5);
      expect(h).toBeCloseTo(50, 5);
    });

    it("turns the back sponsor half a turn, like the name and number", () => {
      const ctx = createMockCtx();
      const low = square("low");
      drawDesignToCanvas(ctx, 1000, designWith({ "lower-back": entry() }), { ...base, sponsorImages: { "lower-back": low } }, regions);
      // The sponsor, then the example name and number, all turned like the back.
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[Math.PI], [Math.PI], [Math.PI]]);
      // bodyBack u .3..0.7 -> x 500; vFrac 0.64 -> v 0.1+0.64*0.4=0.356 -> y 644. A square image fits the 0.12 x 0.05 box by its height.
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      expect(t[0][0]).toBeCloseTo(500, 5);
      expect(t[0][1]).toBeCloseTo(644, 5);
      expect(drawn(ctx, low).w).toBeCloseTo(50, 5);
    });

    it("draws the rest of the front placements on GEPE's center column and upper chest", () => {
      const ctx = createMockCtx();
      const belly = square("belly");
      const waist = square("waist");
      const right = square("chest-right");
      const left = square("chest-left");
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ belly: entry(), waist: entry(), "chest-right": entry(), "chest-left": entry() }),
        { ...base, sponsorImages: { belly, waist, "chest-right": right, "chest-left": left } },
        regions
      );
      // None is turned; the only turns are the example name's and the number's, drawn last.
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
      // bodyFront u .3..0.7, v .5..0.9: belly vFrac .46 -> v .684 -> y 316; waist .29 -> v .616 -> y 384.
      // chest-right uFrac .27 -> u .408 -> x 408, chest-left .73 -> u .592 -> x 592, both vFrac .85 -> v .84 -> y 160.
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      // The four sponsors, and then the number's 0 (translated too, to be turned).
      expect(t.slice(0, 4).map(([x, y]) => [Math.round(x), Math.round(y)])).toEqual([
        [500, 316],
        [500, 384],
        [408, 160],
        [592, 160],
      ]);
    });

    it("draws the upper back sponsor between the nape and the number, upside-down like the back", () => {
      const ctx = createMockCtx();
      const upper = square("upper");
      drawDesignToCanvas(ctx, 1000, designWith({ "upper-back": entry() }), { ...base, sponsorImages: { "upper-back": upper } }, regions);
      // The sponsor and then the number's 0, both turned like the back.
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[Math.PI], [Math.PI]]);
      // bodyBack v .1..0.5, vFrac .21 -> v .184 -> y 816. A square image fits the 0.12 x 0.05 box by its height.
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      expect(t[0][0]).toBeCloseTo(500, 5);
      expect(t[0][1]).toBeCloseTo(816, 5);
      expect(drawn(ctx, upper).w).toBeCloseTo(50, 5);
    });

    it("does not draw the upper back sponsor while the player has a name, but draws it again without one", () => {
      const upper = square("upper");
      const draw = (playerName: string) => {
        const ctx = createMockCtx();
        drawDesignToCanvas(
          ctx,
          1000,
          { ...designWith({ "upper-back": entry() }), playerName },
          { ...base, sponsorImages: { "upper-back": upper } },
          regions
        );
        return (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      };
      expect(draw("PEREZ")).not.toContain(upper);
      expect(draw("")).toContain(upper);
    });

    it("turns the sleeves a quarter turn, in opposite directions, and never mirrors them", () => {
      const ctx = createMockCtx();
      const left = square("left");
      const right = square("right");
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ "sleeve-left": entry(), "sleeve-right": entry() }),
        { ...base, sponsorImages: { "sleeve-left": left, "sleeve-right": right } },
        regions
      );
      // Drawn in GEPE's order: the player's right sleeve (4) and then the left one (5).
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[Math.PI / 2], [-Math.PI / 2], [Math.PI], [Math.PI]]); // the last two are the example name and number
      expect(ctx.scale).not.toHaveBeenCalled();
      // sleeveRight u .75..0.95 -> x 850; v .1..0.4, vFrac 0.53 -> v 0.259 -> y 741.
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      expect(t[0][0]).toBeCloseTo(850, 5);
      expect(t[0][1]).toBeCloseTo(741, 5);
      // sleeveLeft u .05..0.25 -> x 150.
      expect(t[1][0]).toBeCloseTo(150, 5);
      expect(drawn(ctx, left).w).toBeCloseTo(50, 5);
    });

    it("draws every placement that has an image, after the crest and the brand logo", () => {
      const ctx = createMockCtx();
      const crest = square("crest");
      const abdomen = square("abdomen");
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ abdomen: entry() }),
        { ...base, logoImage: crest, sponsorImages: { abdomen } },
        regions
      );
      const order = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(order).toEqual([crest, abdomen]);
    });

    it("draws nothing for a placement with no entry, or whose image is not loaded yet (Review Focus 3)", () => {
      const ctx = createMockCtx();
      // entry without image (still decoding), image without entry (removed): neither draws.
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ abdomen: entry(), "lower-back": entry() }),
        { ...base, sponsorImages: { "lower-back": null, "sleeve-left": square("orphan") } },
        regions
      );
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it("never writes sponsor text", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: square("a") } }, regions);
      // The only text is the examples of the name and the number.
      expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual([NAME_PLACEHOLDER, NUMBER_PLACEHOLDER]);
    });

    it("leaves the canvas state as it found it after each sponsor", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ "lower-back": entry(), abdomen: entry() }),
        { ...base, sponsorImages: { "lower-back": square("n"), abdomen: square("a") } },
        regions
      );
      const saves = (ctx.save as ReturnType<typeof vi.fn>).mock.calls.length;
      const restores = (ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(saves).toBe(restores);
    });
  });

  describe("the number on the chest", () => {
    const blank = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };
    const withChest = (patch: Partial<typeof initialDesignState> = {}) => ({ ...initialDesignState, chestNumber: true, ...patch });
    const texts = (ctx: CanvasRenderingContext2D) => (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);

    it("is not written while the option is off: only the back's number is", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, { ...initialDesignState, playerNumber: "10" }, blank, regions);
      expect(texts(ctx)).toEqual([NAME_PLACEHOLDER, "10"]);
    });

    it("is written on the chest, besides the back's, when the option is on", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withChest({ playerNumber: "10" }), blank, regions);
      // The chest's first, then the back's example name and number.
      expect(texts(ctx)).toEqual(["10", NAME_PLACEHOLDER, "10"]);
    });

    it("shows the example number there too until the player types a number", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withChest(), blank, regions);
      expect(texts(ctx)).toEqual([NUMBER_PLACEHOLDER, NAME_PLACEHOLDER, NUMBER_PLACEHOLDER]);
    });

    it("sits where sponsor 1 would be, upright (the back's is turned)", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withChest({ playerNumber: "10" }), blank, regions);
      // bodyFront u .3..0.7 -> x 500; v .5..0.9, vFrac .63 -> v .752 -> y 248. Drawn first, before the back.
      const [tx, ty] = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(tx).toBeCloseTo(500, 5);
      expect(ty).toBeGreaterThan(200);
      expect(ty).toBeLessThan(330);
      // The only turns are the back's: the example name and the number.
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[Math.PI], [Math.PI]]);
    });

    it("is smaller than the one on the back, and in the same style", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      drawDesignToCanvas(ctx, 1000, withChest({ playerNumber: "10" }), blank, regions, "'Oswald', sans-serif");
      const px = fontPx;
      expect(fonts[0]).toMatch(new RegExp(`^${DEFAULT_PRESET.weight} .*'Oswald', sans-serif$`));
      // fonts: the chest's, the example name, the back's number.
      expect(px(fonts[0])).toBeLessThan(px(fonts[2]));
      expect(px(fonts[0])).toBeCloseTo(1000 * CHEST_NUMBER_FONT_FRACTION * DEFAULT_PRESET.numberScale, 5);
    });

    it("takes the place of sponsor 1: its sponsor is not drawn while the option is on, and is again when off", () => {
      const img = { id: "s", naturalWidth: 100, naturalHeight: 100 } as unknown as HTMLImageElement;
      const entry = { dataUrl: "data:image/png;base64,AAAA", scale: 1 };
      const drawnImages = (design: typeof initialDesignState) => {
        const ctx = createMockCtx();
        drawDesignToCanvas(ctx, 1000, design, { ...blank, sponsorImages: { abdomen: img } }, regions);
        return (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      };
      const design = { ...initialDesignState, sponsors: { abdomen: entry } };
      expect(drawnImages(design)).toContain(img);
      expect(drawnImages({ ...design, chestNumber: true })).not.toContain(img);
    });

    it("leaves the canvas state as it found it", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withChest({ playerNumber: "10" }), blank, regions);
      expect((ctx.save as ReturnType<typeof vi.fn>).mock.calls.length).toBe((ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length);
    });
  });

  describe("name and number positions on the back", () => {
    const blank = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };

    it("puts the name's baseline at NAME_V_FRAC and the number's at NUMBER_V_FRAC", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, { ...initialDesignState, playerName: "LEO", playerNumber: "10" }, blank, regions);
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      // bodyBack v .1..0.5 -> canvas y = (1 - (0.1 + vFrac * 0.4)) * 1000
      expect(t[0][1]).toBeCloseTo((1 - (0.1 + NAME_V_FRAC * 0.4)) * 1000, 5);
      expect(t[1][1]).toBeCloseTo((1 - (0.1 + NUMBER_V_FRAC * 0.4)) * 1000, 5);
    });
  });

  it("draws the dedicated back image in the back region when one is given", () => {
    const ctx = createMockCtx();
    const front = { id: "front" } as unknown as HTMLImageElement;
    const back = { id: "back" } as unknown as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: front, sleevePatternImage: null, logoImage: null, bodyBackPatternImage: back },
      regions
    );
    const used = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(used).toEqual([front, back]);
  });

  // The moldes' images are made for the whole cloth of the front and of the back (and a margin round it), as
  // the compositor draws them: scripts/moldes/extract_moldes.py lays the PDF pieces on the cloth outline to
  // outline, so the rects here and there must be the same.
  describe("the pattern over the cloth's own rects", () => {
    const withRects: UVRegions = {
      ...regions,
      bodyFrontPattern: { u0: 0.3, v0: 0.5, u1: 0.7, v1: 0.9 },
      bodyBackPattern: { u0: 0.35, v0: 0.1, u1: 0.65, v1: 0.5 },
    };
    const images = (front: HTMLImageElement, back: HTMLImageElement) => ({
      bodyPatternImage: front,
      sleevePatternImage: null,
      logoImage: null,
      bodyBackPatternImage: back,
    });
    const drawn = (image: HTMLImageElement, which: "front" | "back") => {
      const ctx = createMockCtx();
      const other = {} as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, initialDesignState, which === "front" ? images(image, other) : images(other, image), withRects);
      const call = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === image && c.length === 5)!;
      const centres = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      return { call, centres };
    };

    it("draws the front's image over the front rect, exactly", () => {
      const front = { id: "front" } as unknown as HTMLImageElement;
      const { call, centres } = drawn(front, "front");
      expect(call.slice(1).map((n: number) => Math.round(n))).toEqual([-200, -200, 400, 400]);
      expect(centres.some((c) => Math.abs(c[0] - 500) < 1e-6 && Math.abs(c[1] - 300) < 1e-6)).toBe(true);
    });

    it("draws the back's image over the back rect, exactly, turned like the back", () => {
      const back = { id: "back" } as unknown as HTMLImageElement;
      const { call, centres } = drawn(back, "back");
      expect(call.slice(1).map((n: number) => Math.round(n))).toEqual([-150, -200, 300, 400]);
      expect(centres.some((c) => Math.abs(c[0] - 500) < 1e-6 && Math.abs(c[1] - 700) < 1e-6)).toBe(true);
    });
  });

  it("knows the GEPE shirt's pattern rects: the cloth's islands and a margin, front and back meeting at the shoulder", () => {
    const { bodyFrontPattern: f, bodyBackPattern: b } = GEPE_UV_REGIONS;
    // the cloth reaches u 0.3137..0.686 at the front's armpits, 0.3396..0.6602 at the back's, v 0.0576..0.942
    expect(f!.u0).toBeLessThan(0.3137);
    expect(f!.u1).toBeGreaterThan(0.686);
    expect(f!.v0).toBeLessThan(0.0576);
    expect(b!.u0).toBeLessThan(0.3396);
    expect(b!.u1).toBeGreaterThan(0.6602);
    expect(b!.v1).toBeGreaterThan(0.942);
    expect(f!.v1).toBe(0.5);
    expect(b!.v0).toBe(0.5);
  });

  it("uses the same pattern rects as the script that makes the moldes", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts/moldes/extract_moldes.py"), "utf8");
    const m = /PATTERN_RECTS = \{"front": \(([^)]*)\), "back": \(([^)]*)\)\}/.exec(script)!;
    const rect = (r: UVRect) => [r.u0, r.v0, r.u1, r.v1];
    expect(m[1].split(",").map(Number)).toEqual(rect(GEPE_UV_REGIONS.bodyFrontPattern!));
    expect(m[2].split(",").map(Number)).toEqual(rect(GEPE_UV_REGIONS.bodyBackPattern!));
  });

  it("falls back to the front image for the back when the back image is missing (Review Focus 4)", () => {
    const ctx = createMockCtx();
    const front = { id: "front" } as unknown as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: front, sleevePatternImage: null, logoImage: null, bodyBackPatternImage: null },
      regions
    );
    const used = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(used).toEqual([front, front]);
  });

  it("still rotates the back image 180 degrees", () => {
    const ctx = createMockCtx();
    const back = {} as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: {} as HTMLImageElement, sleevePatternImage: null, logoImage: null, bodyBackPatternImage: back },
      regions
    );
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI);
  });
});
