export type Rect = { x: number; y: number; w: number; h: number };

// Largest rectangle with the source's proportions that fits in `box`, centered
// in it. Small sources are scaled up to the box.
export function fitInside(srcW: number, srcH: number, box: Rect): Rect {
  const scale = Math.min(box.w / srcW, box.h / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

// The part of a source image that fills `width x height` when scaled to cover
// it (CSS "object-fit: cover"): the overflow is cropped evenly on both sides.
export function coverCrop(srcW: number, srcH: number, width: number, height: number): Rect {
  const scale = Math.max(width / srcW, height / srcH);
  const w = width / scale;
  const h = height / scale;
  return { x: (srcW - w) / 2, y: (srcH - h) / 2, w, h };
}

// Box around the pixels of an RGBA image whose alpha is above the threshold
// (the soft edge of a shadow counts as content), or null if there are none.
export function contentBounds(
  data: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold = 24
): Rect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      if (data[row + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
