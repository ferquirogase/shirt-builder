import type { ColorSlot } from "./svg-recolor";

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
  colors: { primary: "#0a5c36", secondary: "#ffffff", collar: "#ffffff" },
  logoDataUrl: null,
  sponsorText: "",
  playerName: "",
  playerNumber: "",
  projectName: "Mi diseño",
};

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case "SET_BODY_PATTERN":
      return { ...state, bodyPatternId: action.id };
    case "SET_SLEEVE_PATTERN":
      return { ...state, sleevePatternId: action.id };
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
