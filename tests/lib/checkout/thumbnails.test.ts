import { describe, it, expect, vi } from "vitest";
import {
  LARGE_IMAGE_WIDTH,
  THUMBNAIL_WIDTH,
  VIEW_SETTLE_MS,
  captureDesignImages,
  captureThumbnails,
  largeImageOf,
  thumbnailOf,
} from "@/lib/checkout/thumbnails";

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

describe("largeImageOf", () => {
  it("is a sharper JPEG at the large width, to hand to an AI", () => {
    const out = fakeCanvas(mockCtx());
    const wide = { width: 2000, height: 1000 } as HTMLCanvasElement;
    largeImageOf(wide, () => out);
    expect(out.width).toBe(LARGE_IMAGE_WIDTH);
    expect(out.height).toBe(512);
    expect(out.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.92);
  });

  it("never enlarges a canvas that is already smaller", () => {
    const out = fakeCanvas(mockCtx());
    largeImageOf(source, () => out);
    expect(out.width).toBe(1000);
    expect(out.height).toBe(500);
  });
});

describe("captureDesignImages", () => {
  it("takes the small and the large image of each side in the same pass", async () => {
    const log: string[] = [];
    const sizes: number[] = [];
    const createCanvas = () => {
      const canvas = fakeCanvas(mockCtx(), `IMG-${sizes.length}`);
      sizes.push(0);
      return canvas;
    };
    const result = await captureDesignImages({
      canvas: source,
      showView: (side) => log.push(`show-${side}`),
      wait: async () => {},
      createCanvas,
    });

    expect(log).toEqual(["show-front", "show-back"]);
    expect(result).toEqual({
      thumbnails: { front: "IMG-0", back: "IMG-2" },
      images: { front: "IMG-1", back: "IMG-3" },
    });
  });

  it("returns null when a capture fails", async () => {
    const result = await captureDesignImages({
      canvas: source,
      showView: () => {},
      wait: async () => {},
      createCanvas: () => fakeCanvas(null),
    });
    expect(result).toBeNull();
  });
});
