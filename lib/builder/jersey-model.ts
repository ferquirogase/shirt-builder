import { GEPE_UV_REGIONS, UV_REGIONS, type UVRegions } from "./uv-regions";
import type { NecklineOptions } from "./neckline";

export type JerseyModelConfig = {
  url: string;
  /** Separate collar mesh shipped with the model; null to generate one along the neck edge. */
  collarUrl: string | null;
  /**
   * Atlas-sized PNG whose opaque pixels mark the collar rib; painted in the
   * secondary colour over the pattern. Null leaves the collar as patterned.
   */
  collarMaskUrl: string | null;
  /**
   * Tangent-space normal map in the model's UV layout (wrinkles). When set it
   * is the main surface relief and the fine weave becomes a bump map.
   */
  normalMapUrl: string | null;
  /** The normal map's green channel points down (DirectX convention); flips it to OpenGL. */
  normalMapFlipY: boolean;
  /** Strength of the normal map (1 = as authored). */
  normalMapStrength: number;
  uvRegions: UVRegions;
  /** Apply garment-shape.ts (tuned for the legacy model's proportions). */
  reshapeBody: boolean;
  /** Pinch/round the neckline (see neckline.ts); null leaves it as authored. */
  neckline: NecklineOptions | null;
};

export const JERSEY_MODELS = {
  legacy: {
    url: "/models/jersey_ss.obj",
    collarUrl: null,
    collarMaskUrl: null,
    normalMapUrl: null,
    normalMapFlipY: false,
    normalMapStrength: 1.5,
    uvRegions: UV_REGIONS,
    reshapeBody: true,
    neckline: { width: 0.62, depth: 0.7 },
  },
  gepe: {
    url: "/models/gepe_shirt.obj",
    collarUrl: "/models/gepe_collar.obj",
    collarMaskUrl: "/textures/gepe-collar-rim.png",
    normalMapUrl: "/textures/gepe-shirt-normal.png",
    normalMapFlipY: true,
    normalMapStrength: 1.5,
    uvRegions: GEPE_UV_REGIONS,
    reshapeBody: false,
    neckline: null,
  },
} as const satisfies Record<string, JerseyModelConfig>;

export const JERSEY_MODEL: JerseyModelConfig = JERSEY_MODELS.gepe;
