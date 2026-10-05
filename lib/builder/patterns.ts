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
const accent = (label: string, def: string): PatternColor => ({ role: "accent", label, default: def });
const primary = (label: string, def: string): PatternColor => ({ role: "primary", label, default: def });
const secondary = (label: string, def: string): PatternColor => ({ role: "secondary", label, default: def });

export const BODY_PATTERNS: PatternDef[] = [
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg", colors: [PRIMARY] },
  { id: "stripes-v1", label: "Franjas", svgPath: "/patterns/stripes-v1-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "diagonal", label: "Diagonal", svgPath: "/patterns/diagonal-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "gradient", label: "Degradado", svgPath: "/patterns/gradient-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "geometric", label: "Geométrico", svgPath: "/patterns/geometric-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "hoops", label: "Rayas", svgPath: "/patterns/hoops-body.svg", colors: [PRIMARY, SECONDARY] },
  {
    id: "stripes-wide",
    label: "Franjas anchas",
    svgPath: "/patterns/stripes-wide-body.svg",
    colors: [primary("Fondo", "#d71920"), secondary("Franjas", "#111111")],
  },
  {
    id: "stripes-fine",
    label: "Franjas finas",
    svgPath: "/patterns/stripes-fine-body.svg",
    colors: [primary("Franjas principales", "#e2231a"), secondary("Franjas claras", "#ffffff")],
  },
  {
    id: "pinstripes",
    label: "Rayas finas",
    svgPath: "/patterns/pinstripes-body.svg",
    colors: [primary("Fondo", "#d22a1f"), secondary("Rayas", "#f2b705")],
  },
  {
    id: "five-bands",
    label: "Cinco bandas",
    svgPath: "/patterns/five-bands-body.svg",
    colors: [primary("Bandas exteriores y central", "#e8202a"), secondary("Bandas intermedias", "#1d3fa8")],
  },
  {
    id: "stripes-irregular",
    label: "Franjas irregulares",
    svgPath: "/patterns/stripes-irregular-body.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Franjas", "#111111")],
  },
  {
    id: "stripes-three",
    label: "Franjas en tres colores",
    svgPath: "/patterns/stripes-three-body.svg",
    colors: [primary("Franja principal", "#1b4f9c"), secondary("Franja alterna", "#a50044"), accent("Línea fina", "#0b1d4a")],
  },
  {
    id: "stripes-three-wide",
    label: "Tres franjas anchas",
    svgPath: "/patterns/stripes-three-wide-body.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Franjas", "#75aadb")],
  },
  {
    id: "band-horizontal",
    label: "Banda horizontal",
    svgPath: "/patterns/band-horizontal-body.svg",
    colors: [primary("Fondo", "#1d3fa8"), secondary("Banda", "#f6c700"), accent("Bordes de la banda", "#0f2a6b")],
  },
  {
    id: "sash-diagonal",
    label: "Banda diagonal",
    svgPath: "/patterns/sash-diagonal-body.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Banda", "#d0161f")],
  },
  {
    id: "stripes-crossbar",
    label: "Franjas con barra",
    svgPath: "/patterns/stripes-crossbar-body.svg",
    colors: [primary("Fondo", "#1a2a55"), secondary("Franjas y barra", "#f2c200")],
  },
  {
    id: "split-center",
    label: "Mitades con franja",
    svgPath: "/patterns/split-center-body.svg",
    colors: [primary("Mitad izquierda", "#d2171e"), secondary("Mitad derecha", "#0d8a3a"), accent("Franja central", "#ffffff")],
  },
  {
    id: "yoke",
    label: "Hombros de color",
    svgPath: "/patterns/yoke-body.svg",
    colors: [primary("Cuerpo", "#e8590c"), secondary("Hombros", "#1a3a8f")],
  },
  {
    id: "chevron",
    label: "Chevrón",
    svgPath: "/patterns/chevron-body.svg",
    colors: [primary("Cuerpo", "#c8102e"), secondary("Hombros y líneas", "#1b2a6b"), accent("Chevrón principal", "#ffffff")],
  },
  {
    id: "waves",
    label: "Líneas onduladas",
    svgPath: "/patterns/waves-body.svg",
    colors: [primary("Fondo", "#1b2a8f"), secondary("Líneas", "#9fb4ff")],
  },
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
