export type UVRect = { u0: number; v0: number; u1: number; v1: number };

export type UVRegions = {
  bodyFront: UVRect;
  bodyBack: UVRect;
  sleeveLeft: UVRect;
  sleeveRight: UVRect;
  /**
   * Widest the name/number may be, as a fraction of bodyBack's width. Models whose
   * back panel is narrower than the bodyBack rect (the rest of the rect lies over
   * the sleeves) set this; the compositor defaults to 0.8.
   */
  backTextWidthFraction?: number;
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

// public/models/gepe_shirt.obj (the jersey extracted from gepeshirt.obj). Same
// layout as the model above (front and back stacked in one island, back
// rotated 180deg, right sleeve mirrored), but different bounds. Computed from
// the OBJ's own UVs: connected UV islands, with front/back split by world z.
//   body island:  u [0.314, 0.686]  v [0.058, 0.942..0.98]
//   front panel:  u [0.331, 0.668]  v [0.058, ~0.50]
//   back panel:   u [0.296, 0.704]  v [~0.52, 0.980]
//   sleeves:      u [0.641, 0.758] and [0.242, 0.360], v [0.668, 0.980]
export const GEPE_UV_REGIONS: UVRegions = {
  bodyFront: { u0: 0.331, v0: 0.058, u1: 0.668, v1: 0.51 },
  bodyBack: { u0: 0.296, v0: 0.51, u1: 0.704, v1: 0.98 },
  sleeveLeft: { u0: 0.641, v0: 0.668, u1: 0.758, v1: 0.98 },
  sleeveRight: { u0: 0.242, v0: 0.668, u1: 0.36, v1: 0.98 },
  // The rect above spans the sleeves too: the back panel itself is only u 0.355..0.645
  // (0.29 wide, measured from the OBJ's UV triangles). 0.5 of the rect is 0.204, about
  // 70% of that panel, which leaves room for the shirt curving away at the sides.
  backTextWidthFraction: 0.5,
};

export const UV_FLIP_Y = true;
