import { describe, it, expect, vi } from "vitest";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { initialDesignState } from "@/lib/builder/design-state";
import type { UVRegions } from "@/lib/builder/uv-regions";

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
});
