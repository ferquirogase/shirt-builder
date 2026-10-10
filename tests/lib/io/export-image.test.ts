import { describe, it, expect, vi } from "vitest";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import { STAGE_STOPS } from "@/lib/builder/stage-style";

function mockCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    gradient,
    ctx: {
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D,
  };
}

describe("paintStageBackground", () => {
  it("fills the whole canvas with the linear gradient stops, then the glow", () => {
    const { ctx, gradient } = mockCtx();
    paintStageBackground(ctx, 800, 600);
    for (const [offset, color] of STAGE_STOPS) {
      expect(gradient.addColorStop).toHaveBeenCalledWith(offset, color);
    }
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 800, 600);
  });
});
