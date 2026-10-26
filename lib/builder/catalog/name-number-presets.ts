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
  label: string;
  /** CSS variable exposed by next/font in app/layout.tsx; holds the font-family list. */
  cssVar: string;
  weight: number;
  /** Multipliers over the base font sizes used by the compositor. */
  nameScale: number;
  numberScale: number;
};

export const DEFAULT_PRESET_ID = "classic";
/** The border's color to begin with. */
export const OUTLINE_COLOR = "#000000";
/** Visible border thickness as a fraction of the font size. */
export const OUTLINE_WIDTH = 0.04;

export const NAME_NUMBER_PRESETS: NameNumberPreset[] = [
  {
    id: "classic",
    label: "Clásico",
    cssVar: "--font-nn-oswald",
    weight: 700,
    nameScale: 1,
    numberScale: 1,
  },
];

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
