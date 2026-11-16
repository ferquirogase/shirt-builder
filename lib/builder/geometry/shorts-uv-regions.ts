import type { UVRect } from "./uv-regions";

// public/models/gepe_shorts.obj has one UV island: a band that goes round the body. From left to
// right it holds the back of the player's right leg, the side, the front of the right leg, the
// front of the left leg, the side and the back of the left leg ("right" and "left" are the
// player's; seen from the front the right leg is on the left, at -x). v grows upwards: the hem
// is at v 0.035 and the waist at v 0.59. The panels below were measured on the OBJ (a test checks
// that each lands on the cloth, facing the way it should), like the shirt's regions.
//   back, right leg:  u 0.13..0.28   front, right leg: u 0.35..0.50
//   front, left leg:  u 0.52..0.67   back, left leg:   u 0.72..0.88
const HEM_V = 0.035;
const WAIST_V = 0.592;

export const SHORTS_UV_REGIONS = {
  shortsBackRight: { u0: 0.13, v0: HEM_V, u1: 0.28, v1: WAIST_V },
  shortsFrontRight: { u0: 0.35, v0: HEM_V, u1: 0.5, v1: WAIST_V },
  shortsFrontLeft: { u0: 0.52, v0: HEM_V, u1: 0.67, v1: WAIST_V },
  shortsBackLeft: { u0: 0.72, v0: HEM_V, u1: 0.88, v1: WAIST_V },
} as const satisfies Record<string, UVRect>;

export type ShortsRegionName = keyof typeof SHORTS_UV_REGIONS;

// The texture has more cloth per unit of u (across) than of v (up): about 210 units of the model
// against about 158. A picture drawn as it is would look about 1.4 times too wide on the shorts, so
// what is drawn on them is squeezed sideways by this much (the ratio of the two, rounded).
export const SHORTS_UV_STRETCH = 0.74;

// The front of the shorts, as GEPE draws it: the number on the player's left leg with the maker's logo
// under it, and the crest on the right leg under sponsor 12 (see sponsor-slots.ts). Positions are within
// each panel (0..1 across and from the hem up), tuned against GEPE's map and screenshots.
export const SHORTS_FRONT_LAYOUT = {
  number: { region: "shortsFrontLeft", uFrac: 0.55, vFrac: 0.16 },
  brand: { region: "shortsFrontLeft", uFrac: 0.55, vFrac: 0.12 },
  crest: { region: "shortsFrontRight", uFrac: 0.4, vFrac: 0.2 },
} as const satisfies Record<string, { region: ShortsRegionName; uFrac: number; vFrac: number }>;

// The crest on the shorts is drawn as big as the one on the chest. The shorts' texture covers less
// cloth per unit than the shirt's, and by the crest the cloth is stretched more across than the
// 0.74 that suits the sponsors, so the crest has its own size and squeeze: measured on the two OBJs
// (a test checks that both crests come out the same size on the garment, and not stretched).
export const SHORTS_CREST_BOX_FRACTION = 0.09;
export const SHORTS_CREST_STRETCH = 0.64;

// The size of the number on the shorts, as a share of the canvas: a lot smaller than the one on the
// back of the shirt (0.12), like on GEPE's shorts.
export const SHORTS_NUMBER_FONT_FRACTION = 0.085;

// The owners' shorts designs (ESTAMPAS WEB.pdf, page 6), measured on the PDF and laid on this OBJ. The leg
// runs 89 units from the hem (v 0.035) to the waist (v 0.592), v growing evenly with height.
//
// The side seam of the player's right leg, as [v, u] points up the leg (the left leg is its mirror, 1 - u).
// Measured on the OBJ: where the leg reaches farthest out, at each height. The leg's front is toward
// higher u on the right leg (lower u on the left).
export const SHORTS_SIDE_SEAM: readonly (readonly [number, number])[] = [
  [0.035, 0.32],
  [0.25, 0.32],
  [0.4, 0.313],
  [0.55, 0.295],
  [0.592, 0.29],
];
// The side stripe: 37 pt across a leg 156 pt deep in the PDF's side view, about 10.6 units on this leg, which
// takes about 0.048 of u by the side seam (about 220 units of cloth per unit of u there).
export const SHORTS_SIDE_STRIPE_HALF_WIDTH = 0.024;
// The band round the hem: 20 pt of the 300 pt side view, from the hem up, about 6 units on this leg.
export const SHORTS_HEM_BAND_TOP_V = 0.073;
// The two-tone stripe: color 3 below a cut from 37% of the leg's height at its front edge to 50% at its back
// edge (the PDF: 63% and 50% down from the waist), color 2 above.
export const SHORTS_TWO_TONE_SPLIT = { frontV: 0.242, backV: 0.314 } as const;
