// The closed set of colors a player picks from, instead of a free color picker: it is quicker to
// use on a phone, and every color is one that can be printed with a known CMYK (see cmyk.ts).
//
// PROVISIONAL: these twenty are modeled on the palette of a reference configurator, not on GEPE's
// printer. When the printer sends its own list, with the CMYK of each color, it replaces this one.
// Until then the CMYK shown beside each color is the plain conversion from the hexadecimal.
export type PaletteColor = { hex: string; name: string };

export const PALETTE: readonly PaletteColor[] = [
  { hex: "#ffffff", name: "Blanco" },
  { hex: "#000000", name: "Negro" },
  { hex: "#a6a6a6", name: "Gris claro" },
  { hex: "#4d4d4d", name: "Gris oscuro" },
  { hex: "#6f93a8", name: "Gris azulado" },
  { hex: "#e8202a", name: "Rojo" },
  { hex: "#7a1230", name: "Bordó" },
  { hex: "#ff7a00", name: "Naranja" },
  { hex: "#f5b700", name: "Amarillo" },
  { hex: "#0a5c36", name: "Verde" },
  { hex: "#3f8f4a", name: "Verde claro" },
  { hex: "#1f3d2b", name: "Verde oscuro" },
  { hex: "#3a9d94", name: "Turquesa" },
  { hex: "#1d9bf0", name: "Celeste" },
  { hex: "#1e56c8", name: "Azul" },
  { hex: "#14224d", name: "Azul marino" },
  { hex: "#7b2cbf", name: "Violeta" },
  { hex: "#f080c0", name: "Rosa" },
  { hex: "#d4167e", name: "Fucsia" },
  { hex: "#6b4a2b", name: "Marrón" },
];

/** What a color that is not on the palette is called (a design saved before the palette was closed). */
export const OTHER_COLOR_NAME = "Otro color";

export function findPaletteColor(hex: string): PaletteColor | undefined {
  const wanted = hex.toLowerCase();
  return PALETTE.find((c) => c.hex === wanted);
}

export function colorName(hex: string): string {
  return findPaletteColor(hex)?.name ?? OTHER_COLOR_NAME;
}
