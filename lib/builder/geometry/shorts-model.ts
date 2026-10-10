// Everything is in the shirt OBJ's own units (the group is scaled 0.01).
export type ShortsModelConfig = {
  /** The real shorts OBJ. Null while the placeholder shape is used. */
  url: string | null;
};

export const SHORTS_MODEL: ShortsModelConfig = { url: null };

// Placeholder: two tapered legs under the shirt's hem (y 167).
export const PLACEHOLDER_SHORTS = {
  waistY: 166,
  legHeight: 70,
  legCenterX: 17,
  topRadius: 18,
  bottomRadius: 21,
} as const;
