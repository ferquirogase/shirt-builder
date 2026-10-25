import { LOWER_BACK_V_FRAC, UPPER_BACK_V_FRAC } from "../texture/back-layout";

export type SponsorSlotId =
  | "abdomen"
  | "belly"
  | "waist"
  | "sleeve-right"
  | "sleeve-left"
  | "upper-back"
  | "lower-back"
  | "chest-right"
  | "chest-left";
export type SponsorEntry = { dataUrl: string; scale: number };
export type SponsorMap = Partial<Record<SponsorSlotId, SponsorEntry>>;

/** What can take a placement away from the sponsors: something else is printed there. */
export type SponsorBlocker = "playerName";

export type SponsorSlot = {
  id: SponsorSlotId;
  label: string;
  /** Which UV region of the texture atlas the sponsor is printed in. */
  region: "bodyFront" | "bodyBack" | "sleeveLeft" | "sleeveRight";
  /** Center of the sponsor within the region (0..1 on each axis, like the crest). */
  uFrac: number;
  vFrac: number;
  /** Canvas rotation in radians so the image reads upright on the model. */
  rotation: number;
  /** Width of the box the image is fitted in, as a share of the canvas, at scale 1. */
  baseBox: number;
  /** Height of that box, when it is not square: a wide, short rectangle for the chest. */
  baseHeight?: number;
  /** When this is set, something else is printed on this spot and the placement is not offered. */
  blockedBy?: SponsorBlocker;
  /**
   * Where the marker on the 3D shirt goes, when the image is painted somewhere the model has no
   * cloth of its own (next to the neck): a point on the nearest cloth.
   */
  marker?: { uFrac: number; vFrac: number };
};

export const SPONSOR_MIN_SCALE = 0.5;
export const SPONSOR_MAX_SCALE = 1.5;

// GEPE's map of where sponsors go (numbers 1 to 9 on the shirt), in its order. On the front
// the three of the center column (1, 2, 3) are stacked: each is a wide, short rectangle (a
// sponsor's banner), so even at their biggest they do not touch. GEPE draws 8 and 9 above the maker's logo and the crest, but on this
// model the cloth ends at the collar there: they sit on the front of each shoulder, beside the collar.
//
// Placements and orientations were derived from public/models/gepe_shirt.obj.
// On the sleeves the UV axis u runs cuff-to-shoulder and v around the arm, so the
// image is turned a quarter turn (left sleeve one way, right the other); neither
// needs mirroring. The back is rotated half a turn like the name and number.
// The sleeve anchor is the middle of the outer face of the arm. "Right" and "left" are the
// player's: the sleeve seen on the left of the front view is the player's right one (GEPE's 4).
// The nape is not a placement: that spot is reserved for the maker's logo (see the compositor).
export const SPONSOR_SLOTS: SponsorSlot[] = [
  { id: "abdomen", label: "Pecho", region: "bodyFront", uFrac: 0.5, vFrac: 0.58, rotation: 0, baseBox: 0.12, baseHeight: 0.05 },
  { id: "belly", label: "Abdomen", region: "bodyFront", uFrac: 0.5, vFrac: 0.41, rotation: 0, baseBox: 0.12, baseHeight: 0.05 },
  { id: "waist", label: "Cintura", region: "bodyFront", uFrac: 0.5, vFrac: 0.24, rotation: 0, baseBox: 0.12, baseHeight: 0.05 },
  {
    id: "sleeve-right",
    label: "Manga derecha",
    region: "sleeveRight",
    uFrac: 0.5,
    vFrac: 0.53,
    rotation: Math.PI / 2,
    baseBox: 0.05,
  },
  {
    id: "sleeve-left",
    label: "Manga izquierda",
    region: "sleeveLeft",
    uFrac: 0.5,
    vFrac: 0.53,
    rotation: -Math.PI / 2,
    baseBox: 0.05,
  },
  {
    id: "upper-back",
    label: "Espalda alta",
    region: "bodyBack",
    uFrac: 0.5,
    vFrac: UPPER_BACK_V_FRAC,
    rotation: Math.PI,
    baseBox: 0.03,
    // The player's name is printed on the strip where this one goes.
    blockedBy: "playerName",
  },
  {
    id: "lower-back",
    label: "Espalda baja",
    region: "bodyBack",
    uFrac: 0.5,
    vFrac: LOWER_BACK_V_FRAC,
    rotation: Math.PI,
    baseBox: 0.045,
  },
  {
    id: "chest-right",
    label: "Pecho alto derecho",
    region: "bodyFront",
    uFrac: 0.27,
    vFrac: 0.8,
    marker: { uFrac: 0.22, vFrac: 0.8 },
    rotation: 0,
    baseBox: 0.045,
    baseHeight: 0.035,
  },
  {
    id: "chest-left",
    label: "Pecho alto izquierdo",
    region: "bodyFront",
    uFrac: 0.73,
    vFrac: 0.8,
    marker: { uFrac: 0.78, vFrac: 0.8 },
    rotation: 0,
    baseBox: 0.045,
    baseHeight: 0.035,
  },
];

export function findSponsorSlot(id: string): SponsorSlot | undefined {
  return SPONSOR_SLOTS.find((s) => s.id === id);
}

// The placements a design can use right now: all of them, except those where something else
// is printed. A sponsor already uploaded on one that is not offered is kept, only not shown.
export function availableSponsorSlots(design: { playerName: string }): SponsorSlot[] {
  return SPONSOR_SLOTS.filter((slot) => slot.blockedBy !== "playerName" || design.playerName.trim() === "");
}

// The number a placement is shown with, on its marker and on its card: its place among the
// placements that are offered, in GEPE's order. When one is taken away the ones after it
// move up. 0 for a placement that is not offered.
export function sponsorNumber(id: SponsorSlotId, available: readonly SponsorSlot[]): number {
  return available.findIndex((s) => s.id === id) + 1;
}

export function isSponsorSlotId(id: string): id is SponsorSlotId {
  return findSponsorSlot(id) !== undefined;
}

export function clampSponsorScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(SPONSOR_MAX_SCALE, Math.max(SPONSOR_MIN_SCALE, value));
}
