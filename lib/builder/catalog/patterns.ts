import type { PatternRole } from "../texture/svg-recolor";
import { MOLDES_DATA } from "./moldes.generated";

export type PatternColor = {
  role: PatternRole;
  /** Name the user sees in the Colors panel for this role. */
  label: string;
  /** Color the role takes when this design makes the role visible. */
  default: string;
};

export type PatternDef = {
  id: string;
  /** Describes the design; never the name of a team. */
  label: string;
  /** Front panel: an SVG with roles, or a color mask PNG (see mask-recolor.ts). */
  frontPath: string;
  /** Back panel, as seen from behind; the front is used when there is none. */
  backPath?: string;
  /** The sleeve, cap -> cuff along x. It wears the torso's colors. */
  sleevePath: string;
  /** Where the cuff band starts along the sleeve image (0..1); it is painted in the cuff color. Null: no cuff. */
  cuffFrom: number | null;
  /** A light image for the Design panel's grid. */
  thumbPath: string;
  /** Roles the pieces use, in the order they appear in the Colors panel. */
  colors: PatternColor[];
};

const ROLE_DEFAULTS: Record<PatternRole, string> = {
  primary: "#0a5c36",
  secondary: "#ffffff",
  accent: "#f5b700",
  quaternary: "#d0161f",
};

const colorsFor = (roles: PatternRole[]): PatternColor[] =>
  roles.map((role, i) => ({ role, label: i === 0 ? "Color principal" : `Color ${i + 1}`, default: ROLE_DEFAULTS[role] }));

// What each molde of ESTAMPAS WEB.pdf looks like, in its order (the PDF only numbers them).
const MOLDE_LABELS = [
  "Franjas anchas",
  "Franjas",
  "Rayas",
  "Rayas finas",
  "Banda diagonal",
  "Banda diagonal invertida",
  "Banda al pecho",
  "Banda alta",
  "Pechera en V",
  "Mitades",
  "Franjas punteadas",
  "Espigas",
  "Camuflaje",
  "Camuflaje tramado",
  "Mármol",
  "Cebra",
  "Trazos",
  "Destellos",
  "Desgastado",
  "Rayos",
];

// Every piece of a molde is a color mask, laid on the cloth by scripts/moldes/extract_moldes.py.
const MOLDES: PatternDef[] = MOLDES_DATA.map((m, i) => {
  const piece = (kind: string) => `/patterns/moldes/${m.id}-${kind}.png`;
  return {
    id: m.id,
    label: MOLDE_LABELS[i],
    frontPath: piece("front"),
    backPath: piece("back"),
    sleevePath: piece("sleeve"),
    cuffFrom: m.cuffFrom,
    thumbPath: piece("thumb"),
    colors: colorsFor(m.roles),
  };
});

const PLAIN = "/patterns/plain-body.svg";

export const BODY_PATTERNS: PatternDef[] = [
  // A plain shirt, the keeper's first look: one color and a cuff.
  { id: "plain-body", label: "Liso", frontPath: PLAIN, sleevePath: PLAIN, cuffFrom: 0.875, thumbPath: PLAIN, colors: colorsFor(["primary"]) },
  ...MOLDES,
];

export function findPattern(id: string): PatternDef | undefined {
  return BODY_PATTERNS.find((p) => p.id === id);
}

/** The colors the user can edit for the torso: those of the chosen pattern, in the order it declares them. */
export function visibleColors(bodyId: string): PatternColor[] {
  return findPattern(bodyId)?.colors ?? [];
}

/** Whether the pattern's sleeve has a cuff band, which takes the cuff color. */
export function hasCuff(bodyId: string): boolean {
  const cuff = findPattern(bodyId)?.cuffFrom;
  return cuff !== null && cuff !== undefined;
}
