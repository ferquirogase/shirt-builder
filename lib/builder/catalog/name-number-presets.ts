export type NameNumberStyle = {
  presetId: string;
  fill: string;
  /** Draws a border around the text. */
  outline: boolean;
  /** The color of that border: it is kept while the border is switched off. */
  outlineColor: string;
};

export type NameNumberPreset = {
  id: string;
  /** Describes the letters; never the name of a team. */
  label: string;
  /** The font file in app/fonts/name-number/, loaded there with next/font/local. */
  file: string;
  /** CSS variable exposed by next/font (app/fonts/name-number/fonts.ts); holds the font-family list. */
  cssVar: string;
  weight: number;
  /** Height of the digits as a fraction of the font size, measured on the font file. */
  digitHeight: number;
  /** Multipliers over the base font sizes used by the compositor. */
  nameScale: number;
  numberScale: number;
  /** Whether the font draws a Ñ; without one a name prints an N (see printableText). */
  hasEnye: boolean;
  /** Signs the font does not draw: they are left out of a name. */
  missingSigns: string;
};

export const DEFAULT_PRESET_ID = "bloque";
/** The border's color to begin with. */
export const OUTLINE_COLOR = "#000000";
/** Visible border thickness as a fraction of the font size. */
export const OUTLINE_WIDTH = 0.04;
/**
 * How tall the digits are drawn, as a fraction of the base font size. Each typeface is scaled to it,
 * so a number is as tall in any of them (and the chest number stays centered on its point).
 */
export const DIGIT_HEIGHT = 0.72;

type FontFacts = Pick<NameNumberPreset, "id" | "label" | "file" | "digitHeight" | "hasEnye" | "missingSigns">;

// The ten typefaces the site's owners chose (2026-11-11). Digit heights measured on the "8" of each file.
const FONTS: FontFacts[] = [
  { id: "bloque", label: "Bloque", file: "bloque.ttf", digitHeight: 0.7, hasEnye: true, missingSigns: "" },
  { id: "compacta", label: "Compacta", file: "compacta.ttf", digitHeight: 0.698, hasEnye: false, missingSigns: "" },
  { id: "angosta", label: "Angosta", file: "angosta.otf", digitHeight: 0.628, hasEnye: false, missingSigns: "" },
  { id: "cuadrada", label: "Cuadrada", file: "cuadrada.ttf", digitHeight: 0.75, hasEnye: true, missingSigns: "-'" },
  { id: "retro", label: "Retro", file: "retro.ttf", digitHeight: 0.701, hasEnye: false, missingSigns: "" },
  { id: "curva", label: "Curva", file: "curva.ttf", digitHeight: 0.742, hasEnye: true, missingSigns: "" },
  { id: "redondeada", label: "Redondeada", file: "redondeada.otf", digitHeight: 0.702, hasEnye: true, missingSigns: "" },
  { id: "clasica", label: "Clásica", file: "clasica.ttf", digitHeight: 0.742, hasEnye: true, missingSigns: "-'" },
  { id: "fina", label: "Fina", file: "fina.ttf", digitHeight: 0.698, hasEnye: false, missingSigns: "" },
  { id: "ancha", label: "Ancha", file: "ancha.ttf", digitHeight: 0.778, hasEnye: false, missingSigns: ".-'" },
];

export const NAME_NUMBER_PRESETS: NameNumberPreset[] = FONTS.map((font) => {
  const scale = DIGIT_HEIGHT / font.digitHeight;
  return { ...font, cssVar: `--font-nn-${font.id}`, weight: 400, nameScale: scale, numberScale: scale };
});

export function findNameNumberPreset(id: string): NameNumberPreset | undefined {
  return NAME_NUMBER_PRESETS.find((p) => p.id === id);
}

export function getNameNumberPreset(id: string): NameNumberPreset {
  return findNameNumberPreset(id) ?? findNameNumberPreset(DEFAULT_PRESET_ID)!;
}

// The border is on from the start, in black, so the text does not get lost against the cloth.
export function initialNameNumberStyle(): NameNumberStyle {
  return { presetId: DEFAULT_PRESET_ID, fill: "#ffffff", outline: true, outlineColor: OUTLINE_COLOR };
}
