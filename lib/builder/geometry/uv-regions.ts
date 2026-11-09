export type UVRect = { u0: number; v0: number; u1: number; v1: number };

export type UVRegions = {
  bodyFront: UVRect;
  bodyBack: UVRect;
  /**
   * What the cloth really shows of the front and of the back, when the rects above are not it exactly
   * (measured at the side seams: both panels meet there, and the back is narrower than the front).
   * The torso pattern is drawn over these, at one scale for both, so it goes on round the shirt.
   */
  bodyFrontPanel?: UVRect;
  bodyBackPanel?: UVRect;
  sleeveLeft: UVRect;
  sleeveRight: UVRect;
  /**
   * Widest the name/number may be, as a fraction of bodyBack's width. Models whose
   * back panel is narrower than the bodyBack rect (the rest of the rect lies over
   * the sleeves) set this; the compositor defaults to 0.8.
   */
  backTextWidthFraction?: number;
};

// public/models/gepe_shirt.obj (the jersey extracted from gepeshirt.obj). Front
// and back are stacked in one UV island, the back rotated 180deg and the right
// sleeve mirrored. Computed from the OBJ's own UVs: connected UV islands, with
// front/back split by world z.
//   body island:  u [0.314, 0.686]  v [0.058, 0.942..0.98]
//   front panel:  u [0.331, 0.668]  v [0.058, ~0.50]
//   back panel:   u [0.296, 0.704]  v [~0.52, 0.980]
//   sleeves:      u [0.641, 0.758] and [0.242, 0.360], v [0.668, 0.980]
export const GEPE_UV_REGIONS: UVRegions = {
  bodyFront: { u0: 0.331, v0: 0.058, u1: 0.668, v1: 0.51 },
  bodyBack: { u0: 0.296, v0: 0.51, u1: 0.704, v1: 0.98 },
  sleeveLeft: { u0: 0.641, v0: 0.668, u1: 0.758, v1: 0.98 },
  sleeveRight: { u0: 0.242, v0: 0.668, u1: 0.36, v1: 0.98 },
  // Side seam: the front reaches u 0.3232 and 0.6768, the back 0.3633 and 0.6367, at every height from the
  // hem to the armpit (the same vertex, in both islands). The back's v is the front's mirrored (1 - v),
  // and the shoulder seam is at v 0.5, so the two panels have the same height.
  bodyFrontPanel: { u0: 0.3232, v0: 0.0576, u1: 0.6768, v1: 0.5 },
  bodyBackPanel: { u0: 0.3633, v0: 0.5, u1: 0.6367, v1: 0.942 },
  // The rect above spans the sleeves too: the back panel itself is only u 0.355..0.645
  // (0.29 wide, measured from the OBJ's UV triangles). 0.5 of the rect is 0.204, about
  // 70% of that panel, which leaves room for the shirt curving away at the sides.
  backTextWidthFraction: 0.5,
};

export const UV_FLIP_Y = true;
