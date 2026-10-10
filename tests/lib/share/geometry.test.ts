import { describe, it, expect } from "vitest";
import { contentBounds, coverCrop, fitInside } from "@/lib/share/geometry";

describe("fitInside", () => {
  const box = { x: 10, y: 20, w: 100, h: 100 };

  it("fits a wide source by width and centers it vertically", () => {
    expect(fitInside(200, 100, box)).toEqual({ x: 10, y: 45, w: 100, h: 50 });
  });

  it("fits a tall source by height and centers it horizontally", () => {
    expect(fitInside(100, 200, box)).toEqual({ x: 35, y: 20, w: 50, h: 100 });
  });

  it("scales a small source up to the box", () => {
    expect(fitInside(50, 50, box)).toEqual({ x: 10, y: 20, w: 100, h: 100 });
  });
});

describe("coverCrop", () => {
  it("crops the sides of a wide source", () => {
    expect(coverCrop(200, 100, 100, 100)).toEqual({ x: 50, y: 0, w: 100, h: 100 });
  });

  it("crops the top and bottom of a tall source", () => {
    expect(coverCrop(100, 200, 100, 100)).toEqual({ x: 0, y: 50, w: 100, h: 100 });
  });

  it("uses the whole source when the ratio already matches", () => {
    expect(coverCrop(100, 200, 50, 100)).toEqual({ x: 0, y: 0, w: 100, h: 200 });
  });

  it("barely crops the 941x1672 background into 1080x1920", () => {
    const crop = coverCrop(941, 1672, 1080, 1920);
    expect(crop.h).toBeCloseTo(1672, 5);
    expect(crop.w).toBeGreaterThan(940);
    expect(crop.w).toBeLessThanOrEqual(941);
    expect(crop.x).toBeGreaterThanOrEqual(0);
  });
});

describe("contentBounds", () => {
  // 4 wide x 3 tall RGBA image, fully transparent.
  function image() {
    return new Uint8ClampedArray(4 * 3 * 4);
  }
  function setAlpha(data: Uint8ClampedArray, x: number, y: number, alpha: number) {
    data[(y * 4 + x) * 4 + 3] = alpha;
  }

  it("returns the box around the visible pixels", () => {
    const data = image();
    setAlpha(data, 1, 1, 255);
    setAlpha(data, 2, 2, 100);
    expect(contentBounds(data, 4, 3)).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it("ignores almost transparent pixels", () => {
    const data = image();
    setAlpha(data, 0, 0, 10);
    setAlpha(data, 3, 1, 255);
    expect(contentBounds(data, 4, 3)).toEqual({ x: 3, y: 1, w: 1, h: 1 });
  });

  it("returns null for a fully transparent image", () => {
    expect(contentBounds(image(), 4, 3)).toBeNull();
  });
});
