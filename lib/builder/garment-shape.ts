import type { Vec3 } from "./mesh-boundary";

// The source OBJ reads as a dress: the torso is ~136 units long for a ~137
// unit sleeve-to-sleeve span, the chest (68 wide at the armpit) is narrower
// than the hem (79), and the sleeves are long. This point-wise warp brings the
// proportions closer to a football jersey. Coordinates are the OBJ's own
// (y up, ~cm).
export const SHAPE = {
  /** Below this y the torso is shortened (the armpit seam). */
  armpitY: 240,
  /** Fraction of the original armpit-to-hem length that remains. */
  torsoLength: 0.75,
  /** Distance over which the compression eases in below the armpit. */
  easeIn: 15,
  /** Horizontal scale of the torso, as [y, factor] pairs from armpit down. */
  widthByY: [
    [242, 1],
    [212, 1.14],
    [200, 1.14],
    [180, 1.04],
    [160, 0.98],
  ] as ReadonlyArray<readonly [number, number]>,
  /** |x| range over which the torso-width scaling fades out into the sleeve. */
  widthFade: [34, 46] as const,
  /** Shoulder tip the sleeves shorten toward (x is mirrored). */
  sleeveAnchor: [38, 272, -4] as const,
  /** Fraction of the original sleeve length that remains. */
  sleeveLength: 0.78,
  /** |x| range over which sleeve shortening fades in from the shoulder. */
  sleeveFade: [38, 52] as const,
} as const;

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function widthFactor(y: number): number {
  const table = SHAPE.widthByY;
  if (y >= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [y1, f1] = table[i];
    if (y >= y1) {
      const [y0, f0] = table[i - 1];
      return f0 + ((f1 - f0) * (y0 - y)) / (y0 - y1);
    }
  }
  return table[table.length - 1][1];
}

export function createGarmentReshape(): (p: Vec3) => Vec3 {
  return ([x, y, z]) => {
    // 1. Torso width: scale x by a factor that depends on height, fading out
    //    toward the sleeves so the cuffs aren't scaled with the body.
    const sign = Math.sign(x) || 1;
    const ax = Math.abs(x);
    const torsoWeight = 1 - smoothstep(SHAPE.widthFade[0], SHAPE.widthFade[1], ax);
    let nx = sign * ax * (1 + (widthFactor(y) - 1) * torsoWeight);
    let ny = y;
    let nz = z;

    // 2. Torso length: compress what is below the armpit, easing in so there
    //    is no crease at the seam.
    if (y < SHAPE.armpitY) {
      const d = SHAPE.armpitY - y;
      const s = SHAPE.torsoLength + (1 - SHAPE.torsoLength) * (1 - smoothstep(0, SHAPE.easeIn, d));
      ny = SHAPE.armpitY - d * s;
    }

    // 3. Sleeves: pull toward the shoulder tip, fading in from the joint.
    const sleeveWeight = smoothstep(SHAPE.sleeveFade[0], SHAPE.sleeveFade[1], ax) * (y >= SHAPE.armpitY - 4 ? 1 : 0);
    if (sleeveWeight > 0) {
      const [sx, sy, sz] = SHAPE.sleeveAnchor;
      const pull = (1 - SHAPE.sleeveLength) * sleeveWeight;
      nx += (sign * sx - nx) * pull;
      ny += (sy - ny) * pull;
      nz += (sz - nz) * pull;
    }

    return [nx, ny, nz];
  };
}
