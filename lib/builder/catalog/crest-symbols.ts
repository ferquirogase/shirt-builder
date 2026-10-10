export type CrestSymbolDef = {
  id: string;
  label: string;
  /** Path data in a 24x24 box, drawn with the even-odd rule. */
  d: string;
};

export const CREST_SYMBOLS: CrestSymbolDef[] = [
  { id: "star", label: "Estrella", d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id: "bolt", label: "Rayo", d: "M7 2v11h3v9l7-12h-4l4-8z" },
  { id: "crown", label: "Corona", d: "M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" },
  { id: "ball", label: "Pelota", d: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8.4l3.4 2.5-1.3 4H9.9l-1.3-4z" },
  { id: "diamond", label: "Rombo", d: "M12 2l10 10-10 10L2 12z" },
  {
    id: "heart",
    label: "Corazón",
    d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  },
  { id: "cross", label: "Cruz", d: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" },
  { id: "ring", label: "Aro", d: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z" },
];

export function findCrestSymbol(id: string): CrestSymbolDef | undefined {
  return CREST_SYMBOLS.find((symbol) => symbol.id === id);
}
