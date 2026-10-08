export type NameNumberStyle = {
  presetId: string;
  fill: string;
  outlineColor: string;
  /** Visible outline thickness as a fraction of the font size (0 = no outline). */
  outlineWidth: number;
  shadow: boolean;
};

export type NameNumberPreset = Omit<NameNumberStyle, "presetId"> & {
  id: string;
  label: string;
  /** CSS variable exposed by next/font in app/layout.tsx; holds the font-family list. */
  cssVar: string;
  weight: number;
  /** Multipliers over the base font sizes used by the compositor. */
  nameScale: number;
  numberScale: number;
};

export const MAX_OUTLINE_WIDTH = 0.12;
export const DEFAULT_PRESET_ID = "classic";

export const NAME_NUMBER_PRESETS: NameNumberPreset[] = [
  {
    id: "classic",
    label: "Clásico",
    cssVar: "--font-nn-oswald",
    weight: 700,
    nameScale: 1,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0,
    shadow: false,
  },
  {
    id: "modern",
    label: "Moderno",
    cssVar: "--font-nn-montserrat",
    weight: 800,
    nameScale: 0.9,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0.02,
    shadow: false,
  },
  {
    id: "retro",
    label: "Retro",
    cssVar: "--font-nn-righteous",
    weight: 400,
    nameScale: 1,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#d62828",
    outlineWidth: 0.03,
    shadow: true,
  },
  {
    id: "block",
    label: "Bloque",
    cssVar: "--font-nn-anton",
    weight: 400,
    nameScale: 1.05,
    numberScale: 1.1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0,
    shadow: false,
  },
  {
    id: "elegant",
    label: "Elegante",
    cssVar: "--font-nn-playfair",
    weight: 900,
    nameScale: 0.95,
    numberScale: 1,
    fill: "#f5d77a",
    outlineColor: "#000000",
    outlineWidth: 0,
    shadow: false,
  },
  {
    id: "outline",
    label: "Contorno",
    cssVar: "--font-nn-alfa-slab",
    weight: 400,
    nameScale: 0.9,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0.06,
    shadow: false,
  },
];

export function findNameNumberPreset(id: string): NameNumberPreset | undefined {
  return NAME_NUMBER_PRESETS.find((p) => p.id === id);
}

export function getNameNumberPreset(id: string): NameNumberPreset {
  return findNameNumberPreset(id) ?? findNameNumberPreset(DEFAULT_PRESET_ID)!;
}

export function styleFromPreset(id: string): NameNumberStyle | null {
  const preset = findNameNumberPreset(id);
  if (!preset) return null;
  return {
    presetId: preset.id,
    fill: preset.fill,
    outlineColor: preset.outlineColor,
    outlineWidth: preset.outlineWidth,
    shadow: preset.shadow,
  };
}
