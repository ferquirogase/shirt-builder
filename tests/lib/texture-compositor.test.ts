import { describe, it, expect, vi } from "vitest";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { initialDesignState } from "@/lib/builder/design-state";
import { UV_REGIONS, UV_FLIP_Y, type UVRegions, type UVRect } from "@/lib/builder/uv-regions";

function createMockCtx() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: "",
    font: "",
    textAlign: "left",
  } as unknown as CanvasRenderingContext2D;
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
      { ...initialDesignState, sponsorText: "ACME" },
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

  it("keeps every real UV_REGIONS rect within the measured UV island", () => {
    // Measured OBJ UV island bounds (see uv-regions.ts): u in [0.226, 0.774],
    // v in [0.058, 0.988]. bodyFront.v0 = 0 sits slightly outside the v
    // lower bound due to 8-cell quantization when the regions were measured
    // (see the comment above UV_REGIONS), so a small tolerance is applied.
    const uMin = 0.226;
    const uMax = 0.774;
    const vMin = 0.058;
    const vMax = 0.988;
    const tolerance = 0.06;

    const allRects = Object.values(UV_REGIONS);
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

    it("does not rotate front-panel sponsor text", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, { ...initialDesignState, sponsorText: "ACME" }, blank, regions);
      expect(ctx.fillText).toHaveBeenCalledWith("ACME", expect.any(Number), expect.any(Number));
      expect(ctx.rotate).not.toHaveBeenCalled();
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
