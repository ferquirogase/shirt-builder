import type { ColorSlot } from "./svg-recolor";
import { findPattern, visibleColors } from "./patterns";

export type DesignState = {
  bodyPatternId: string;
  sleevePatternId: string;
  colors: Record<ColorSlot, string>;
  logoDataUrl: string | null;
  sponsorText: string;
  playerName: string;
  playerNumber: string;
  projectName: string;
};

export type DesignAction =
  | { type: "SET_BODY_PATTERN"; id: string }
  | { type: "SET_SLEEVE_PATTERN"; id: string }
  | { type: "SET_COLOR"; slot: ColorSlot; value: string }
  | { type: "SET_LOGO"; dataUrl: string | null }
  | { type: "SET_SPONSOR_TEXT"; value: string }
  | { type: "SET_PLAYER_NAME"; value: string }
  | { type: "SET_PLAYER_NUMBER"; value: string }
  | { type: "SET_PROJECT_NAME"; value: string };

export const initialDesignState: DesignState = {
  bodyPatternId: "stripes-v1",
  sleevePatternId: "sleeve-plain",
  colors: { primary: "#0a5c36", secondary: "#ffffff", accent: "#f5b700", collar: "#ffffff" },
  logoDataUrl: null,
  sponsorText: "",
  playerName: "",
  playerNumber: "",
  projectName: "Mi diseño",
};

// Switching pattern: roles the new pattern uses that were not already visible
// take the pattern's defaults; roles already visible keep the user's choice.
// Pure, so the UI can preview exactly what a click would produce.
export function colorsAfterPatternChange(
  state: DesignState,
  kind: "body" | "sleeve",
  id: string
): DesignState["colors"] {
  const pattern = findPattern(id);
  if (!pattern) return state.colors;

  const inUse = new Set(visibleColors(state.bodyPatternId, state.sleevePatternId).map((c) => c.role));
  const colors = { ...state.colors };
  for (const color of pattern.colors) {
    if (!inUse.has(color.role)) colors[color.role] = color.default;
  }
  return colors;
}

function withPatternChange(state: DesignState, kind: "body" | "sleeve", id: string): DesignState {
  const next = kind === "body" ? { ...state, bodyPatternId: id } : { ...state, sleevePatternId: id };
  return { ...next, colors: colorsAfterPatternChange(state, kind, id) };
}

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case "SET_BODY_PATTERN":
      return withPatternChange(state, "body", action.id);
    case "SET_SLEEVE_PATTERN":
      return withPatternChange(state, "sleeve", action.id);
    case "SET_COLOR":
      return { ...state, colors: { ...state.colors, [action.slot]: action.value } };
    case "SET_LOGO":
      return { ...state, logoDataUrl: action.dataUrl };
    case "SET_SPONSOR_TEXT":
      return { ...state, sponsorText: action.value };
    case "SET_PLAYER_NAME":
      return { ...state, playerName: action.value };
    case "SET_PLAYER_NUMBER":
      return { ...state, playerNumber: action.value };
    case "SET_PROJECT_NAME":
      return { ...state, projectName: action.value };
    default:
      return state;
  }
}
