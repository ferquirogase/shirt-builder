import { GEPE_UV_REGIONS, type UVRegions } from "./uv-regions";

export type JerseyModelConfig = {
  url: string;
  /** Separate collar mesh shipped with the model, in the same coordinates as the body. */
  collarUrl: string;
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
};

export const JERSEY_MODEL: JerseyModelConfig = {
  url: "/models/gepe_shirt.obj",
  collarUrl: "/models/gepe_collar.obj",
  collarMaskUrl: "/textures/gepe-collar-rim.png",
  normalMapUrl: "/textures/gepe-shirt-normal.png",
  normalMapFlipY: true,
  normalMapStrength: 1.5,
  uvRegions: GEPE_UV_REGIONS,
};
