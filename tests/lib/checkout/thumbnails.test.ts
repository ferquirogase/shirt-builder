import { describe, it, expect, vi } from "vitest";
import { THUMBNAIL_WIDTH, VIEW_SETTLE_MS, captureThumbnails, thumbnailOf } from "@/lib/checkout/thumbnails";

function mockCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

function fakeCanvas(ctx: CanvasRenderingContext2D | null, url = "data:image/jpeg;base64,AAA") {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => url),
  } as unknown as HTMLCanvasElement;
}

const source = { width: 1000, height: 500 } as HTMLCanvasElement;

describe("thumbnailOf", () => {
  it("scales to the thumbnail width keeping the aspect, painting the stage before the capture", () => {
    const ctx = mockCtx();
    const out = fakeCanvas(ctx);
    const url = thumbnailOf(source, () => out);

    expect(url).toBe("data:image/jpeg;base64,AAA");
    expect(out.width).toBe(THUMBNAIL_WIDTH);
    expect(out.height).toBe(200);
    const fillOrder = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const drawOrder = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(fillOrder).toBeLessThan(drawOrder);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0, THUMBNAIL_WIDTH, 200);
    expect(out.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.85);
  });

  it("returns null without a 2d context or for an empty canvas", () => {
    expect(thumbnailOf(source, () => fakeCanvas(null))).toBeNull();
    expect(thumbnailOf({ width: 0, height: 0 } as HTMLCanvasElement, () => fakeCanvas(mockCtx()))).toBeNull();
  });
});

describe("captureThumbnails", () => {
  it("shows the front, waits, captures, then the back, waits, captures", async () => {
    const log: string[] = [];
    let captures = 0;
    const createCanvas = () => {
      captures += 1;
      log.push(`capture-${captures}`);
      return fakeCanvas(mockCtx(), captures === 1 ? "FRONT" : "BACK");
    };

    const result = await captureThumbnails({
      canvas: source,
      showView: (side) => log.push(`show-${side}`),
      wait: async (ms) => {
        log.push(`wait-${ms}`);
      },
      createCanvas,
    });

    expect(result).toEqual({ front: "FRONT", back: "BACK" });
    expect(log).toEqual([
      "show-front",
      `wait-${VIEW_SETTLE_MS}`,
      "capture-1",
      "show-back",
      `wait-${VIEW_SETTLE_MS}`,
      "capture-2",
    ]);
  });

  it("returns null when a capture fails", async () => {
    const result = await captureThumbnails({
      canvas: source,
      showView: () => {},
      wait: async () => {},
      createCanvas: () => fakeCanvas(null),
    });
    expect(result).toBeNull();
  });
});
