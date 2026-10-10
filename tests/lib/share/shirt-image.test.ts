import { describe, it, expect, vi } from "vitest";
import { shirtImageOf } from "@/lib/share/shirt-image";

// A 4x3 capture whose only visible pixels are the ones listed.
function pixels(visible: Array<[number, number]>) {
  const data = new Uint8ClampedArray(4 * 3 * 4);
  for (const [x, y] of visible) data[(y * 4 + x) * 4 + 3] = 255;
  return data;
}

function fakeCanvas(ctx: unknown) {
  return { width: 0, height: 0, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement;
}

const source = { width: 4, height: 3 } as HTMLCanvasElement;

describe("shirtImageOf", () => {
  it("copies the capture with its transparency and crops it to the visible pixels", () => {
    const copyCtx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels([[1, 1], [2, 2]]) })) };
    const outCtx = { drawImage: vi.fn() };
    const copy = fakeCanvas(copyCtx);
    const out = fakeCanvas(outCtx);
    const canvases = [copy, out];

    const result = shirtImageOf(source, () => canvases.shift()!);

    expect(result).toBe(out);
    expect(copy.width).toBe(4);
    expect(copy.height).toBe(3);
    expect(copyCtx.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(copyCtx.getImageData).toHaveBeenCalledWith(0, 0, 4, 3);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(outCtx.drawImage).toHaveBeenCalledWith(copy, 1, 1, 2, 2, 0, 0, 2, 2);
  });

  it("returns null for a capture with nothing visible (the model has not loaded yet)", () => {
    const copyCtx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels([]) })) };
    expect(shirtImageOf(source, () => fakeCanvas(copyCtx))).toBeNull();
  });

  it("returns null for an empty canvas or without a 2d context", () => {
    expect(shirtImageOf({ width: 0, height: 0 } as HTMLCanvasElement, () => fakeCanvas({}))).toBeNull();
    expect(shirtImageOf(source, () => fakeCanvas(null))).toBeNull();
  });
});
