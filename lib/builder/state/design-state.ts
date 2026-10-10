import type { ColorSlot } from "../texture/svg-recolor";
import { findPattern, visibleColors } from "../catalog/patterns";
import { clampSponsorScale, isSponsorSlotId, type SponsorMap, type SponsorSlotId } from "../catalog/sponsor-slots";
import { findNameNumberPreset, initialNameNumberStyle, type NameNumberStyle } from "../catalog/name-number-presets";

export type ShortsColorSource = "primary" | "secondary";
export type ShortsConfig = { included: boolean; colorSource: ShortsColorSource };
const SHORTS_COLOR_SOURCES: readonly ShortsColorSource[] = ["primary", "secondary"];

export type DesignState = {
  bodyPatternId: string;
  sleevePatternId: string;
  colors: Record<ColorSlot, string>;
  logoDataUrl: string | null;
  sponsors: SponsorMap;
  playerName: string;
  playerNumber: string;
  nameNumberStyle: NameNumberStyle;
  projectName: string;
  shorts: ShortsConfig;
};

export type DesignAction =
  | { type: "SET_BODY_PATTERN"; id: string }
  | { type: "SET_SLEEVE_PATTERN"; id: string }
  | { type: "SET_COLOR"; slot: ColorSlot; value: string }
  | { type: "SET_LOGO"; dataUrl: string | null }
  | { type: "SET_SPONSOR"; slot: SponsorSlotId; dataUrl: string }
  | { type: "SET_SPONSOR_SCALE"; slot: SponsorSlotId; value: number }
  | { type: "REMOVE_SPONSOR"; slot: SponsorSlotId }
  | { type: "SET_PLAYER_NAME"; value: string }
  | { type: "SET_PLAYER_NUMBER"; value: string }
  | { type: "SET_NN_PRESET"; id: string }
  | { type: "SET_NN_FILL"; value: string }
  | { type: "SET_NN_OUTLINE"; value: boolean }
  | { type: "SET_PROJECT_NAME"; value: string }
  | { type: "SET_SHORTS_INCLUDED"; value: boolean }
  | { type: "SET_SHORTS_COLOR_SOURCE"; value: ShortsColorSource }
  | { type: "RESET_DESIGN" };

export const initialDesignState: DesignState = {
  bodyPatternId: "stripes-v1",
  sleevePatternId: "sleeve-plain",
  colors: { primary: "#0a5c36", secondary: "#ffffff", accent: "#f5b700", collar: "#ffffff" },
  logoDataUrl: null,
  sponsors: {},
  playerName: "",
  playerNumber: "",
  nameNumberStyle: initialNameNumberStyle(),
  projectName: "Mi diseño",
  shorts: { included: false, colorSource: "primary" },
};

// The shorts have no color of their own: they wear one of the shirt's.
export function shortsColor(state: Pick<DesignState, "colors" | "shorts">): string {
  return state.colors[state.shorts.colorSource];
}

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
    case "SET_SPONSOR": {
      if (!isSponsorSlotId(action.slot)) return state;
      const scale = state.sponsors[action.slot]?.scale ?? 1;
      return { ...state, sponsors: { ...state.sponsors, [action.slot]: { dataUrl: action.dataUrl, scale } } };
    }
    case "SET_SPONSOR_SCALE": {
      const current = isSponsorSlotId(action.slot) ? state.sponsors[action.slot] : undefined;
      if (!current) return state;
      const entry = { ...current, scale: clampSponsorScale(action.value) };
      return { ...state, sponsors: { ...state.sponsors, [action.slot]: entry } };
    }
    case "REMOVE_SPONSOR": {
      if (!isSponsorSlotId(action.slot) || !state.sponsors[action.slot]) return state;
      const sponsors = { ...state.sponsors };
      delete sponsors[action.slot];
      return { ...state, sponsors };
    }
    case "SET_PLAYER_NAME":
      return { ...state, playerName: action.value };
    case "SET_PLAYER_NUMBER":
      return { ...state, playerNumber: action.value };
    case "SET_NN_PRESET":
      // Only the typeface changes; the user's color and border stay.
      return findNameNumberPreset(action.id)
        ? { ...state, nameNumberStyle: { ...state.nameNumberStyle, presetId: action.id } }
        : state;
    case "SET_NN_FILL":
      return { ...state, nameNumberStyle: { ...state.nameNumberStyle, fill: action.value } };
    case "SET_NN_OUTLINE":
      return { ...state, nameNumberStyle: { ...state.nameNumberStyle, outline: action.value } };
    case "SET_PROJECT_NAME":
      return { ...state, projectName: action.value };
    case "RESET_DESIGN":
      // What is bought and the project name are not part of the design: they stay.
      return {
        ...initialDesignState,
        projectName: state.projectName,
        shorts: { ...initialDesignState.shorts, included: state.shorts.included },
      };
    case "SET_SHORTS_INCLUDED":
      return state.shorts.included === action.value
        ? state
        : { ...state, shorts: { ...state.shorts, included: action.value } };
    case "SET_SHORTS_COLOR_SOURCE":
      return SHORTS_COLOR_SOURCES.includes(action.value)
        ? { ...state, shorts: { ...state.shorts, colorSource: action.value } }
        : state;
    default:
      return state;
  }
}
