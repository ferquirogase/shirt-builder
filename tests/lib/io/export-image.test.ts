import { describe, it, expect, vi } from "vitest";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import { STAGE_COLOR } from "@/lib/builder/stage-style";

function mockCtx() {
  const gradient = { addColorStop: vi.fn() };
  const fills: unknown[] = [];
  const ctx = {
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(() => fills.push(ctx.fillStyle)),
    drawImage: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
  return { gradient, fills, ctx };
}

describe("paintStageBackground", () => {
  it("fills the whole canvas with the flat stage color, then the glow", () => {
    const { ctx, gradient, fills } = mockCtx();
    paintStageBackground(ctx, 800, 600);
    expect(ctx.createLinearGradient).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 800, 600);
    expect(fills[0]).toBe(STAGE_COLOR);
    expect(fills[1]).toBe(gradient);
  });
});
