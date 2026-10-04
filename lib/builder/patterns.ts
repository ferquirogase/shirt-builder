import type { PatternRole } from "./svg-recolor";

export type PatternColor = {
  role: PatternRole;
  /** Name the user sees in the Colors panel for this role, in this design. */
  label: string;
  /** Color the role takes when this design makes the role visible. */
  default: string;
};

export type PatternDef = {
  id: string;
  /** Describes the design; never the name of a team. */
  label: string;
  /** Front panel (and back panel unless `svgPathBack` is set). */
  svgPath: string;
  /** Optional back panel, drawn as seen by someone looking at the back. */
  svgPathBack?: string;
  /** Roles the SVG uses, in the order they appear in the Colors panel. */
  colors: PatternColor[];
};

const PRIMARY: PatternColor = { role: "primary", label: "Color primario", default: "#0a5c36" };
const SECONDARY: PatternColor = { role: "secondary", label: "Color secundario", default: "#ffffff" };

export const BODY_PATTERNS: PatternDef[] = [
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg", colors: [PRIMARY] },
  { id: "stripes-v1", label: "Franjas", svgPath: "/patterns/stripes-v1-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "diagonal", label: "Diagonal", svgPath: "/patterns/diagonal-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "gradient", label: "Degradado", svgPath: "/patterns/gradient-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "geometric", label: "Geométrico", svgPath: "/patterns/geometric-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "hoops", label: "Rayas", svgPath: "/patterns/hoops-body.svg", colors: [PRIMARY, SECONDARY] },
];

export const SLEEVE_PATTERNS: PatternDef[] = [
  { id: "sleeve-plain", label: "Color secundario", svgPath: "/patterns/sleeve-plain.svg", colors: [SECONDARY] },
  { id: "sleeve-primary", label: "Color primario", svgPath: "/patterns/sleeve-primary.svg", colors: [PRIMARY] },
  { id: "sleeve-cuff", label: "Con puño", svgPath: "/patterns/sleeve-cuff.svg", colors: [PRIMARY, SECONDARY] },
];

export function findPattern(id: string): PatternDef | undefined {
  return BODY_PATTERNS.find((p) => p.id === id) ?? SLEEVE_PATTERNS.find((p) => p.id === id);
}

/**
 * The colors the user can currently edit: those of the chosen torso pattern,
 * then any role only the chosen sleeve pattern uses. One entry per role; when
 * both patterns use a role, the torso's label wins.
 */
export function visibleColors(bodyId: string, sleeveId: string): PatternColor[] {
  const seen = new Set<PatternRole>();
  const result: PatternColor[] = [];
  for (const pattern of [findPattern(bodyId), findPattern(sleeveId)]) {
    for (const color of pattern?.colors ?? []) {
      if (seen.has(color.role)) continue;
      seen.add(color.role);
      result.push(color);
    }
  }
  return result;
}
