export type UVRect = { u0: number; v0: number; u1: number; v1: number };

export type UVRegions = {
  bodyFront: UVRect;
  bodyBack: UVRect;
  /**
   * Where the torso pattern's front and back images are drawn, when the rects above are not it: the
   * cloth's whole island (and a margin), front and back meeting at the shoulder seam. The moldes' images
   * are made for exactly these rects (scripts/moldes/extract_moldes.py, PATTERN_RECTS).
   */
  bodyFrontPattern?: UVRect;
  bodyBackPattern?: UVRect;
  /** Where the brand labels go (see BRAND_LABEL_URLS): each label's image fills its rect. */
  frontLabel?: UVRect;
  backLabel?: UVRect;
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
  // The torso island: front below the shoulder seam (v 0.5), back above it, turned 180deg. The side seam
  // runs from the hem (v 0.0576, back 0.942) to the armpit (v 0.355, back 0.645) at u 0.3232..0.6768 on the
  // front and 0.3633..0.6367 on the back; the cloth is widest at the armpits (front u 0.3137..0.686, back
  // 0.3396..0.6602) and the shoulder seam spans u 0.359..0.641. The rects are that and a margin of 0.01.
  bodyFrontPattern: { u0: 0.3037, v0: 0.0476, u1: 0.6963, v1: 0.5 },
  bodyBackPattern: { u0: 0.3296, v0: 0.5, u1: 0.6704, v1: 0.9521 },
  // The labels where the owners' moldes put them (ESTAMPAS WEB.pdf, the same place on all but moldes 1-6),
  // laid on the cloth the way scripts/moldes/extract_moldes.py lays the moldes: the front tag low on the
  // viewer's right, the back strip centered about 40 mm (on the PDF) above the hem. The front tag is moved
  // 0.0126 toward the middle from the PDF's spot, to sit centered in a white stripe of Franjas anchas
  // (molde 01's stripe there: u 0.5767..0.6284).
  frontLabel: { u0: 0.5838, v0: 0.1149, u1: 0.6213, v1: 0.1329 },
  backLabel: { u0: 0.483, v0: 0.8694, u1: 0.5168, v1: 0.8724 },
  // The rect above spans the sleeves too: the back panel itself is only u 0.355..0.645
  // (0.29 wide, measured from the OBJ's UV triangles). 0.5 of the rect is 0.204, about
  // 70% of that panel, which leaves room for the shirt curving away at the sides.
  backTextWidthFraction: 0.5,
};

export const UV_FLIP_Y = true;
