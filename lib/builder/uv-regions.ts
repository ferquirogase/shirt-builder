export type UVRect = { u0: number; v0: number; u1: number; v1: number };

export type UVRegions = {
  bodyFront: UVRect;
  bodyBack: UVRect;
  sleeveLeft: UVRect;
  sleeveRight: UVRect;
};

// Measured with an 8x8 UV checker debug texture (see uv-checker-texture.ts)
// on public/models/jersey_ss.obj, read visually in a browser.
//
// CanvasTexture defaults to flipY = true, which is what rendered during
// this measurement: texel v=0 samples the BOTTOM row of the canvas, v=1
// the TOP row (this is why image/canvas textures "just work" against
// Blender's OpenGL-style UVs, where v=0 is the bottom of the UV image).
// So a canvas row r (0 at the visual top) covering canvas-fraction
// f = [r/8, (r+1)/8] maps to v = [1 - (r+1)/8, 1 - r/8], while columns
// (u) are not flipped: u = [col/8, (col+1)/8].
//
// Observed cells:
//   pecho (bodyFront):    cols 3-4, rows 4-7  -> u:[0.375,0.625] v:[0,0.5]
//   espalda (bodyBack):   cols 3-4, rows 1-3  -> u:[0.375,0.625] v:[0.5,0.875]
//   manga derecha (sleeveRight): col 2, rows 0-2 -> u:[0.25,0.375] v:[0.625,1.0]
//   manga izquierda (sleeveLeft): NOT directly observed (occluded in the
//     browser check) — inferred by mirroring sleeveRight's column across
//     the UV island (col 2 -> col 5), same row range. Treat this one rect
//     as an estimate; revisit once the real body/sleeve patterns are
//     visible on the model (Task 9's manual check) in case it's off.
export const UV_REGIONS: UVRegions = {
  bodyFront: { u0: 0.375, v0: 0, u1: 0.625, v1: 0.5 },
  bodyBack: { u0: 0.375, v0: 0.5, u1: 0.625, v1: 0.875 },
  sleeveLeft: { u0: 0.625, v0: 0.625, u1: 0.75, v1: 1.0 },
  sleeveRight: { u0: 0.25, v0: 0.625, u1: 0.375, v1: 1.0 },
};

export const UV_FLIP_Y = true;
