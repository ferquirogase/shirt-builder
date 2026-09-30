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
});
