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
