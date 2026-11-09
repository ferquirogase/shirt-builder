import type { PatternRole } from "../texture/svg-recolor";

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
  /**
   * Optional back panel, drawn as seen by someone looking at the back. Without one the front's drawing
   * is used, which is right when it reads the same going round the shirt (horizontal bands, stripes
   * whose period divides the panel). A design too busy to continue gives a plain back (`PLAIN_BACK`).
   */
  svgPathBack?: string;
  /** Roles the SVG uses, in the order they appear in the Colors panel. */
  colors: PatternColor[];
};

const PRIMARY: PatternColor = { role: "primary", label: "Color primario", default: "#0a5c36" };
const SECONDARY: PatternColor = { role: "secondary", label: "Color secundario", default: "#ffffff" };
const accent = (label: string, def: string): PatternColor => ({ role: "accent", label, default: def });
const primary = (label: string, def: string): PatternColor => ({ role: "primary", label, default: def });
const secondary = (label: string, def: string): PatternColor => ({ role: "secondary", label, default: def });

/** A back with only the primary color, for a front too busy to continue round the shirt. */
export const PLAIN_BACK = "/patterns/plain-body.svg";

export const BODY_PATTERNS: PatternDef[] = [
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg", colors: [PRIMARY] },
  { id: "stripes-v1", label: "Franjas", svgPath: "/patterns/stripes-v1-body.svg", svgPathBack: "/patterns/stripes-v1-back.svg", colors: [PRIMARY, SECONDARY] },
  { id: "diagonal", label: "Diagonal", svgPath: "/patterns/diagonal-body.svg", svgPathBack: "/patterns/diagonal-back.svg", colors: [PRIMARY, SECONDARY] },
  { id: "gradient", label: "Degradado", svgPath: "/patterns/gradient-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "geometric", label: "Geométrico", svgPath: "/patterns/geometric-body.svg", svgPathBack: PLAIN_BACK, colors: [PRIMARY, SECONDARY] },
  { id: "hoops", label: "Rayas", svgPath: "/patterns/hoops-body.svg", colors: [PRIMARY, SECONDARY] },
  {
    id: "stripes-wide",
    label: "Franjas anchas",
    svgPath: "/patterns/stripes-wide-body.svg",
    svgPathBack: "/patterns/stripes-wide-back.svg",
    colors: [primary("Fondo", "#d71920"), secondary("Franjas", "#111111")],
  },
  {
    id: "five-bands",
    label: "Cinco bandas",
    svgPath: "/patterns/five-bands-body.svg",
    svgPathBack: "/patterns/five-bands-back.svg",
    colors: [primary("Bandas exteriores y central", "#e8202a"), secondary("Bandas intermedias", "#1d3fa8")],
  },
  {
    id: "stripes-irregular",
    label: "Franjas irregulares",
    svgPath: "/patterns/stripes-irregular-body.svg",
    svgPathBack: "/patterns/stripes-irregular-back.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Franjas", "#111111")],
  },
  {
    id: "stripes-three",
    label: "Franjas en tres colores",
    svgPath: "/patterns/stripes-three-body.svg",
    svgPathBack: "/patterns/stripes-three-back.svg",
    colors: [primary("Franja principal", "#1b4f9c"), secondary("Franja alterna", "#a50044"), accent("Línea fina", "#0b1d4a")],
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
    svgPathBack: "/patterns/sash-diagonal-back.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Banda", "#d0161f")],
  },
  {
    id: "stripes-crossbar",
    label: "Franjas con barra",
    svgPath: "/patterns/stripes-crossbar-body.svg",
    svgPathBack: "/patterns/stripes-crossbar-back.svg",
    colors: [primary("Fondo", "#1a2a55"), secondary("Franjas y barra", "#f2c200")],
  },
  {
    id: "split-center",
    label: "Mitades con franja",
    svgPath: "/patterns/split-center-body.svg",
    svgPathBack: "/patterns/split-center-back.svg",
    colors: [primary("Mitad izquierda", "#d2171e"), secondary("Mitad derecha", "#0d8a3a"), accent("Franja central", "#ffffff")],
  },
  {
    id: "yoke",
    label: "Hombros de color",
    svgPath: "/patterns/yoke-body.svg",
    svgPathBack: "/patterns/yoke-back.svg",
    colors: [primary("Cuerpo", "#e8590c"), secondary("Hombros", "#1a3a8f")],
  },
  {
    id: "chevron",
    label: "Chevrón",
    svgPath: "/patterns/chevron-body.svg",
    svgPathBack: "/patterns/chevron-back.svg",
    colors: [primary("Cuerpo", "#c8102e"), secondary("Hombros y líneas", "#1b2a6b"), accent("Chevrón principal", "#ffffff")],
  },
  {
    id: "waves",
    label: "Líneas onduladas",
    svgPath: "/patterns/waves-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#1b2a8f"), secondary("Líneas", "#9fb4ff")],
  },
  // Busy designs, from artwork: the back is plain.
  {
    id: "tangle",
    label: "Trazos entrelazados",
    svgPath: "/patterns/tangle-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#313131"), secondary("Trazos", "#ba0d26"), accent("Trama de fondo", "#424242")],
  },
  {
    id: "swirl",
    label: "Remolinos",
    svgPath: "/patterns/swirl-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#293e69"), secondary("Remolinos", "#3f5fa1")],
  },
  {
    id: "pixel",
    label: "Pixelado",
    svgPath: "/patterns/pixel-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#343434"), secondary("Pixelado", "#d11d3a")],
  },
  {
    id: "brush",
    label: "Pinceladas",
    svgPath: "/patterns/brush-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#f1127b"), secondary("Pincelada clara", "#1072d2"), accent("Pincelada oscura", "#13418e")],
  },
  {
    id: "marble",
    label: "Mármol",
    svgPath: "/patterns/marble-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#09663c"), secondary("Vetas", "#3bb875"), accent("Salpicado", "#ffffff")],
  },
  {
    id: "blocks",
    label: "Bloques de rayas",
    svgPath: "/patterns/blocks-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#074875"), secondary("Rayas", "#fcb547")],
  },
  {
    id: "camo",
    label: "Camuflaje",
    svgPath: "/patterns/camo-body.svg",
    svgPathBack: PLAIN_BACK,
    colors: [primary("Fondo", "#c0d848"), secondary("Camuflaje", "#25563b"), accent("Trama clara", "#9cbe3f")],
  },
];

/**
 * The sleeve texture: one design for every shirt, a sleeve color and a stripe at the edge. Its colors are
 * chosen apart from the torso's (`sleeve` and `sleeveTrim`), so no pattern declares them.
 */
export const SLEEVE_SVG_PATH = "/patterns/sleeve.svg";

export function findPattern(id: string): PatternDef | undefined {
  return BODY_PATTERNS.find((p) => p.id === id);
}

/** The colors the user can edit for the torso: those of the chosen pattern, in the order it declares them. */
export function visibleColors(bodyId: string): PatternColor[] {
  return findPattern(bodyId)?.colors ?? [];
}
