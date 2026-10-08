import { describe, it, expect, vi } from "vitest";
import { drawDesignToCanvas } from "@/lib/builder/texture/texture-compositor";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { NAME_V_FRAC, NUMBER_V_FRAC } from "@/lib/builder/texture/back-layout";
import { OUTLINE_COLOR, OUTLINE_WIDTH } from "@/lib/builder/catalog/name-number-presets";
import { GEPE_UV_REGIONS, UV_FLIP_Y, type UVRegions, type UVRect } from "@/lib/builder/geometry/uv-regions";

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

  it("does not write the player number when empty", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.fillText).not.toHaveBeenCalled();
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
      expect(ctx.rotate).toHaveBeenCalledTimes(1);
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
      // classic: weight 700, number base 0.12 * 1000 = 120px, scale 1
      expect(fonts[0]).toBe("700 120px 'Oswald', sans-serif");
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
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10", playerName: "PEREZ" }), blank, regions);
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
      // Number size: 0.12 * 1000 * 1 = 120px.
      expect(seen.lineWidth).toBeCloseTo(120 * OUTLINE_WIDTH * 2, 5);
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
        widthAtDraw = ctx.measureText(text).width;
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
        widthAtDraw = ctx.measureText(text).width;
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
      // classic: name base 0.05 * 1000 = 50px, scale 1
      expect(fonts[0]).toMatch(/^700 50px /);
    });

    it("falls back to the classic preset for an unknown preset id (Review Focus 2)", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, presetId: "gone" },
      });
      expect(() => drawDesignToCanvas(ctx, 1000, design, blank, regions)).not.toThrow();
      expect(fonts[0]).toMatch(/^700 120px /);
    });
  });

  // The two sleeve UV islands are mirror images across the island's vertical
  // axis: the sleeveRight island (-x side of the model) runs cuff-to-shoulder
  // in the opposite u direction from sleeveLeft, so a directional sleeve
  // pattern (e.g. a cuff band) must be drawn mirrored there or it lands at
  // the shoulder instead of the cuff.
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
    // bodyFront u .3..0.7, v .5..0.9. Chest point: 0.70 across (toward the viewer's right,
    // since u grows with model x) and 0.71 up from the hem:
    //   u = 0.3 + 0.70 * 0.4 = 0.58 -> x 580;  v = 0.5 + 0.71 * 0.4 = 0.784 -> y 216.
    // The crest box is 65px (6.5% of the canvas), centered there.
    const [, x, y, w, h] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(w).toBeCloseTo(65, 5);
    expect(h).toBeCloseTo(65, 5);
    expect(x + w / 2).toBeCloseTo(580, 5);
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
    expect(x + w / 2).toBeCloseTo(580, 5);
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
      // Smaller than the crest (65px): a maker's mark is 3% of the canvas.
      expect(w).toBeCloseTo(30, 5);
      expect(h).toBeCloseTo(30 * (381 / 512), 5);
      expect(x + w / 2).toBeCloseTo(420, 5);
      expect(y + h / 2).toBeCloseTo(216, 5);
    });

    it("is always drawn, with or without a crest, and does not move when a crest is set", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      const crest = { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand, logoImage: crest }, regions);
      expect(drawnImages(ctx)).toEqual([crest, forDark]);
      const [, x, , w] = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(x + w / 2).toBeCloseTo(420, 5);
    });

    it("uses the version for dark backgrounds over dark pixels", () => {
      const ctx = ctxWithPixels(10, 90, 50);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
      expect(drawnImages(ctx)).toEqual([forDark]);
    });

    it("uses the version for light backgrounds over light pixels", () => {
      const ctx = ctxWithPixels(250, 250, 250);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions);
      expect(drawnImages(ctx)).toEqual([forLight]);
    });

    it("samples the pixels under the logo, after the patterns are painted", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, bodyPatternImage: {} as HTMLImageElement, ...brand }, regions);
      const sample = (ctx as unknown as { getImageData: ReturnType<typeof vi.fn> }).getImageData;
      const patternDraws = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.invocationCallOrder;
      expect(sample).toHaveBeenCalledTimes(1);
      expect(sample.mock.invocationCallOrder[0]).toBeGreaterThan(patternDraws[1]);
      expect(sample.mock.invocationCallOrder[0]).toBeLessThan(patternDraws[2]);
    });

    it("falls back to the primary color when pixels can't be read (no getImageData)", () => {
      const dark = createMockCtx();
      drawDesignToCanvas(dark, 1000, initialDesignState, { ...base, ...brand }, regions); // primary #0a5c36 is dark
      expect(drawnImages(dark)).toEqual([forDark]);

      const light = createMockCtx();
      const pale = { ...initialDesignState, colors: { ...initialDesignState.colors, primary: "#f5f0e0" } };
      drawDesignToCanvas(light, 1000, pale, { ...base, ...brand }, regions);
      expect(drawnImages(light)).toEqual([forLight]);
    });

    it("falls back to the primary color when reading pixels throws (tainted canvas)", () => {
      const ctx = createMockCtx();
      (ctx as unknown as { getImageData: unknown }).getImageData = vi.fn(() => {
        throw new Error("SecurityError");
      });
      expect(() => drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, ...brand }, regions)).not.toThrow();
      expect(drawnImages(ctx)).toEqual([forDark]);
    });

    it("uses the other version when the preferred one is missing", () => {
      const ctx = ctxWithPixels(0, 0, 0); // dark -> prefers forDark, which is missing
      drawDesignToCanvas(ctx, 1000, initialDesignState, { ...base, brandLogoForLight: forLight, brandLogoForDark: null }, regions);
      expect(drawnImages(ctx)).toEqual([forLight]);
    });

    it("draws nothing when no brand logo has loaded yet", () => {
      const ctx = ctxWithPixels(0, 0, 0);
      drawDesignToCanvas(ctx, 1000, initialDesignState, base, regions);
      expect(ctx.drawImage).not.toHaveBeenCalled();
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
      // bodyFront u .3..0.7 -> center u 0.5 -> x 500; v .5..0.9, vFrac 0.58 -> v 0.732 -> y 268.
      expect(translate[0][0]).toBeCloseTo(500, 5);
      expect(translate[0][1]).toBeCloseTo(268, 5);
      expect(rotate).toHaveLength(0);
      expect(w).toBeCloseTo(120, 5); // baseBox 0.12 of 1000
      expect(h).toBeCloseTo(120, 5);
      expect(x).toBeCloseTo(-60, 5); // centered on the translated origin
      expect(y).toBeCloseTo(-60, 5);
    });

    it("scales the size with the placement's scale", () => {
      const ctx = createMockCtx();
      const img = square("abdomen");
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry(1.5) }), { ...base, sponsorImages: { abdomen: img } }, regions);
      expect(drawn(ctx, img).w).toBeCloseTo(180, 5);
    });

    it("limits a scale outside 0.5..1.5 and treats NaN as 1 (Review Focus 1)", () => {
      const sizeAt = (scale: number) => {
        const ctx = createMockCtx();
        const img = square("abdomen");
        drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry(scale) }), { ...base, sponsorImages: { abdomen: img } }, regions);
        return drawn(ctx, img).w;
      };
      expect(sizeAt(40)).toBeCloseTo(180, 5);
      expect(sizeAt(0)).toBeCloseTo(60, 5);
      expect(sizeAt(Number.NaN)).toBeCloseTo(120, 5);
    });

    it("keeps a wide image's proportions", () => {
      const ctx = createMockCtx();
      const wide = { id: "w", naturalWidth: 400, naturalHeight: 100 } as unknown as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: wide } }, regions);
      const { w, h } = drawn(ctx, wide);
      expect(w).toBeCloseTo(120, 5);
      expect(h).toBeCloseTo(30, 5);
    });

    it("draws an SVG with no natural size as a square instead of failing (Review Focus 3)", () => {
      const ctx = createMockCtx();
      const svg = { id: "svg", naturalWidth: 0, naturalHeight: 0 } as unknown as HTMLImageElement;
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: svg } }, regions);
      const { w, h } = drawn(ctx, svg);
      expect(w).toBeCloseTo(120, 5);
      expect(h).toBeCloseTo(120, 5);
    });

    it("turns the back sponsors half a turn, like the name and number", () => {
      const ctx = createMockCtx();
      const nape = square("nape");
      const low = square("low");
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ nape: entry(), "lower-back": entry() }),
        { ...base, sponsorImages: { nape, "lower-back": low } },
        regions
      );
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[Math.PI], [Math.PI]]);
      // bodyBack u .3..0.7 -> x 500; vFrac 0.10 -> v 0.1+0.10*0.4=0.14 -> y 860; 0.75 -> v 0.4 -> y 600.
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      expect(t[0][0]).toBeCloseTo(500, 5);
      expect(t[0][1]).toBeCloseTo(860, 5);
      expect(t[1][1]).toBeCloseTo(600, 5);
      expect(drawn(ctx, nape).w).toBeCloseTo(30, 5);
      expect(drawn(ctx, low).w).toBeCloseTo(45, 5);
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
      expect((ctx.rotate as ReturnType<typeof vi.fn>).mock.calls).toEqual([[-Math.PI / 2], [Math.PI / 2]]);
      expect(ctx.scale).not.toHaveBeenCalled();
      // sleeveLeft u .05..0.25 -> x 150; v .1..0.4, vFrac 0.53 -> v 0.259 -> y 741.
      const t = (ctx.translate as ReturnType<typeof vi.fn>).mock.calls;
      expect(t[0][0]).toBeCloseTo(150, 5);
      expect(t[0][1]).toBeCloseTo(741, 5);
      // sleeveRight u .75..0.95 -> x 850.
      expect(t[1][0]).toBeCloseTo(850, 5);
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
        designWith({ abdomen: entry(), nape: entry() }),
        { ...base, sponsorImages: { nape: null, "lower-back": square("orphan") } },
        regions
      );
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it("never writes sponsor text", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, designWith({ abdomen: entry() }), { ...base, sponsorImages: { abdomen: square("a") } }, regions);
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("leaves the canvas state as it found it after each sponsor", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(
        ctx,
        1000,
        designWith({ nape: entry(), abdomen: entry() }),
        { ...base, sponsorImages: { nape: square("n"), abdomen: square("a") } },
        regions
      );
      const saves = (ctx.save as ReturnType<typeof vi.fn>).mock.calls.length;
      const restores = (ctx.restore as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(saves).toBe(restores);
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
