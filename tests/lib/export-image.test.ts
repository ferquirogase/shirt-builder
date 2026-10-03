import { describe, it, expect, vi } from "vitest";
import { exportStagePng, paintStageBackground } from "@/lib/builder/export-image";
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

describe("exportStagePng", () => {
  it("paints the background first, then the WebGL capture, and returns a PNG data URL", () => {
    const { ctx } = mockCtx();
    const out = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => "data:image/png;base64,AAA"),
    } as unknown as HTMLCanvasElement;
    const source = { width: 800, height: 600 } as HTMLCanvasElement;

    const url = exportStagePng(source, () => out);

    expect(url).toBe("data:image/png;base64,AAA");
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
    const fillOrder = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const drawOrder = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(fillOrder).toBeLessThan(drawOrder);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(out.toDataURL).toHaveBeenCalledWith("image/png");
  });

  it("returns null when a 2d context is unavailable", () => {
    const out = { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
    expect(exportStagePng({ width: 10, height: 10 } as HTMLCanvasElement, () => out)).toBeNull();
  });
});
