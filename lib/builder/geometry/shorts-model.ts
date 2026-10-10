// The shorts OBJ is modelled in the shirt's own coordinate frame (units in the
// hundreds, the group is scaled 0.01), so it needs no repositioning: its waist
// sits inside the shirt, above the shirt's hem.
export type ShortsModelConfig = {
  url: string;
  /** Tangent-space wrinkle map in the model's UV layout, like the shirt's. */
  normalMapUrl: string;
  /** The normal map's green channel points down (DirectX convention); flips it to OpenGL. */
  normalMapFlipY: boolean;
  /** Strength of the normal map (1 = as authored). */
  normalMapStrength: number;
};

export const SHORTS_MODEL: ShortsModelConfig = {
  url: "/models/gepe_shorts.obj",
  normalMapUrl: "/textures/gepe-shorts-normal.png",
  normalMapFlipY: true,
  normalMapStrength: 1.5,
};

// Lowest point of the shorts OBJ (a test checks it against the file).
export const SHORTS_BOTTOM_Y = 13.73;
