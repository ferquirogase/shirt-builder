import { CREST_SHAPES } from "../catalog/crest-shapes";

export type CrestDivisionId = "plain" | "half" | "stripes" | "band";

export const CREST_DIVISIONS: { id: CrestDivisionId; label: string }[] = [
  { id: "plain", label: "Liso" },
  { id: "half", label: "Mitad" },
  { id: "stripes", label: "Franjas" },
  { id: "band", label: "Banda" },
];

export type CrestSymbol = { kind: "icon"; id: string } | { kind: "initials"; text: string } | null;

export type CrestConfig = {
  shapeId: string;
  divisionId: CrestDivisionId;
  /** `outline` is the border's color; without one the border wears the secondary, as crests made before it did. */
  colors: { primary: string; secondary: string; outline?: string };
  symbol: CrestSymbol;
};

export const MAX_INITIALS = 4;

export const INITIAL_CREST: CrestConfig = {
  shapeId: CREST_SHAPES[0].id,
  divisionId: "plain",
  colors: { primary: "#0a5c36", secondary: "#ffffff" },
  symbol: null,
};

// Accents are folded to their base letter ("Álvaro" -> A...), keeping Ñ, which is a letter of its own.
function baseLetter(char: string): string {
  return char.toUpperCase() === "Ñ" ? "Ñ" : char.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Up to four letters or digits, uppercase: what fits inside a shield.
export function cleanInitials(text: string): string {
  return [...text].map(baseLetter).join("").toUpperCase().replace(/[^A-ZÑ0-9]/g, "").slice(0, MAX_INITIALS);
}
