export type NameNumberStyle = {
  presetId: string;
  fill: string;
  /** Draws a black border around the text. */
  outline: boolean;
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
  {
    id: "modern",
    label: "Moderno",
    cssVar: "--font-nn-montserrat",
    weight: 800,
    nameScale: 0.9,
    numberScale: 1,
  },
];

export function findNameNumberPreset(id: string): NameNumberPreset | undefined {
  return NAME_NUMBER_PRESETS.find((p) => p.id === id);
}

export function getNameNumberPreset(id: string): NameNumberPreset {
  return findNameNumberPreset(id) ?? findNameNumberPreset(DEFAULT_PRESET_ID)!;
}

export function initialNameNumberStyle(): NameNumberStyle {
  return { presetId: DEFAULT_PRESET_ID, fill: "#ffffff", outline: false };
}
