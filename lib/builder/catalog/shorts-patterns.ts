import type { PatternColor } from "./patterns";

export type ShortsRole = "primary" | "secondary" | "accent";

export type ShortsPatternDef = {
  id: string;
  /** Describes the design; never the name of a team. */
  label: string;
  /** Roles the design uses, in the order they appear in the Colors panel. */
  colors: (PatternColor & { role: ShortsRole })[];
};

const LABELS: Record<ShortsRole, string> = { primary: "Color principal", secondary: "Color 2", accent: "Color 3" };
// The colors the shorts start with: their own from the start, never the shirt's (the owners' ask). The same
// defaults as the shirt's, so a new kit matches until one of them is changed.
export const SHORTS_DEFAULT_COLORS: Record<ShortsRole, string> = { primary: "#0a5c36", secondary: "#ffffff", accent: "#f5b700" };

const colorsFor = (roles: ShortsRole[]) => roles.map((role) => ({ role, label: LABELS[role], default: SHORTS_DEFAULT_COLORS[role] }));

// The plain shorts and the owners' three designs (ESTAMPAS WEB.pdf, page 6: moldelos 3, 1, 2 and 4). They are
// drawn by the shorts compositor on the shorts' UV band, with the PDF's proportions (see shorts-uv-regions.ts).
export const SHORTS_PATTERNS: ShortsPatternDef[] = [
  { id: "shorts-plain", label: "Liso", colors: colorsFor(["primary"]) },
  // A band all round the hem.
  { id: "shorts-hem-band", label: "Ruedo", colors: colorsFor(["primary", "secondary"]) },
  // A stripe down each side seam, from the hem up through the waistband.
  { id: "shorts-side-stripe", label: "Franja lateral", colors: colorsFor(["primary", "secondary"]) },
  // That stripe in two colors: color 2 above, color 3 below a slanted cut.
  { id: "shorts-side-two-tone", label: "Lateral bicolor", colors: colorsFor(["primary", "secondary", "accent"]) },
];

export const DEFAULT_SHORTS_PATTERN_ID = "shorts-plain";

export function findShortsPattern(id: string): ShortsPatternDef | undefined {
  return SHORTS_PATTERNS.find((p) => p.id === id);
}

/** The colors the user can edit on the shorts: those of the chosen design (the main one for an unknown design). */
export function shortsColorsFor(id: string): ShortsPatternDef["colors"] {
  return (findShortsPattern(id) ?? SHORTS_PATTERNS[0]).colors;
}
