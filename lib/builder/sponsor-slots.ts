import { LOWER_BACK_V_FRAC, NAPE_V_FRAC } from "./back-layout";

export type SponsorSlotId = "abdomen" | "sleeve-left" | "sleeve-right" | "nape" | "lower-back";
export type SponsorEntry = { dataUrl: string; scale: number };
export type SponsorMap = Partial<Record<SponsorSlotId, SponsorEntry>>;

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
  /** Longer side of the box the image is fitted in, as a share of the canvas, at scale 1. */
  baseBox: number;
};

export const SPONSOR_MIN_SCALE = 0.5;
export const SPONSOR_MAX_SCALE = 1.5;

// Placements and orientations were derived from public/models/gepe_shirt.obj.
// On the sleeves the UV axis u runs cuff-to-shoulder and v around the arm, so the
// image is turned a quarter turn (left sleeve one way, right the other); neither
// needs mirroring. The back is rotated half a turn like the name and number.
// The sleeve anchor is the middle of the outer face of the arm.
export const SPONSOR_SLOTS: SponsorSlot[] = [
  { id: "abdomen", label: "Abdomen", region: "bodyFront", uFrac: 0.5, vFrac: 0.3, rotation: 0, baseBox: 0.12 },
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
    id: "sleeve-right",
    label: "Manga derecha",
    region: "sleeveRight",
    uFrac: 0.5,
    vFrac: 0.53,
    rotation: Math.PI / 2,
    baseBox: 0.05,
  },
  { id: "nape", label: "Nuca", region: "bodyBack", uFrac: 0.5, vFrac: NAPE_V_FRAC, rotation: Math.PI, baseBox: 0.03 },
  {
    id: "lower-back",
    label: "Espalda baja",
    region: "bodyBack",
    uFrac: 0.5,
    vFrac: LOWER_BACK_V_FRAC,
    rotation: Math.PI,
    baseBox: 0.045,
  },
];

export function findSponsorSlot(id: string): SponsorSlot | undefined {
  return SPONSOR_SLOTS.find((s) => s.id === id);
}

export function isSponsorSlotId(id: string): id is SponsorSlotId {
  return findSponsorSlot(id) !== undefined;
}

export function clampSponsorScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(SPONSOR_MAX_SCALE, Math.max(SPONSOR_MIN_SCALE, value));
}
