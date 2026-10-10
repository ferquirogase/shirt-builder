import type { ColorSlot } from "../texture/svg-recolor";
import { colorDistance, contrastColor } from "../color/contrast";
import { findCrestShape } from "../catalog/crest-shapes";
import type { CrestConfig } from "../crest/crest-config";
import { crestDataUrl } from "../crest/crest-svg";
import { findPattern, visibleColors } from "../catalog/patterns";
import { clampSponsorScale, isSponsorSlotId, type SponsorMap, type SponsorSlotId } from "../catalog/sponsor-slots";
import { findNameNumberPreset, initialNameNumberStyle, type NameNumberStyle } from "../catalog/name-number-presets";

export type ShortsColorSource = "primary" | "secondary";
export type ShortsConfig = { included: boolean; colorSource: ShortsColorSource };
const SHORTS_COLOR_SOURCES: readonly ShortsColorSource[] = ["primary", "secondary"];

export type LookTarget = "player" | "keeper";

/** What differs between the player shirt and the keeper's: patterns and colors. */
export type GarmentLook = {
  bodyPatternId: string;
  sleevePatternId: string;
  colors: Record<ColorSlot, string>;
};

export type KeeperConfig = {
  included: boolean;
  /** Null until the keeper is first added. Kept when it is taken out, so the choices come back. */
  look: GarmentLook | null;
  /** The keeper's name/number color; null means black or white, whichever reads on its shirt. */
  nameNumberFill: string | null;
};

// Colors a keeper traditionally wears, in no particular order.
const KEEPER_PRIMARIES = ["#f5b700", "#e8202a", "#1d9bf0", "#7b2cbf", "#ff7a00", "#111111"];

// The candidate farthest from both of the team's colors, so the keeper is never mistaken for a player.
export function pickKeeperPrimary(team: { primary: string; secondary: string }): string {
  let best = KEEPER_PRIMARIES[0];
  let bestScore = -1;
  for (const candidate of KEEPER_PRIMARIES) {
    const score = Math.min(colorDistance(candidate, team.primary), colorDistance(candidate, team.secondary));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function defaultKeeperLook(team: { primary: string; secondary: string }): GarmentLook {
  const primary = pickKeeperPrimary(team);
  const trim = contrastColor(primary);
  return {
    bodyPatternId: "plain-body",
    sleevePatternId: "sleeve-primary",
    colors: { primary, secondary: trim, accent: trim, collar: trim },
  };
}

export type DesignState = {
  bodyPatternId: string;
  sleevePatternId: string;
  colors: Record<ColorSlot, string>;
  logoDataUrl: string | null;
  /** The crest made in the creator; `logoDataUrl` holds it drawn. Null when there is none or it was uploaded. */
  crestConfig: CrestConfig | null;
  sponsors: SponsorMap;
  playerName: string;
  playerNumber: string;
  nameNumberStyle: NameNumberStyle;
  projectName: string;
  shorts: ShortsConfig;
  keeper: KeeperConfig;
};

export type DesignAction =
  | { type: "SET_BODY_PATTERN"; id: string; target?: LookTarget }
  | { type: "SET_SLEEVE_PATTERN"; id: string; target?: LookTarget }
  | { type: "SET_COLOR"; slot: ColorSlot; value: string; target?: LookTarget }
  | { type: "SET_LOGO"; dataUrl: string | null }
  | { type: "SET_CREST_CONFIG"; config: CrestConfig }
  | { type: "SET_SPONSOR"; slot: SponsorSlotId; dataUrl: string }
  | { type: "SET_SPONSOR_SCALE"; slot: SponsorSlotId; value: number }
  | { type: "REMOVE_SPONSOR"; slot: SponsorSlotId }
  | { type: "SET_PLAYER_NAME"; value: string }
  | { type: "SET_PLAYER_NUMBER"; value: string }
  | { type: "SET_NN_PRESET"; id: string }
  | { type: "SET_NN_FILL"; value: string; target?: LookTarget }
  | { type: "SET_NN_OUTLINE"; value: boolean }
  | { type: "SET_PROJECT_NAME"; value: string }
  | { type: "SET_SHORTS_INCLUDED"; value: boolean }
  | { type: "SET_SHORTS_COLOR_SOURCE"; value: ShortsColorSource }
  | { type: "SET_KEEPER_INCLUDED"; value: boolean }
  | { type: "RESET_DESIGN" };

export type LookAction = Extract<
  DesignAction,
  { type: "SET_BODY_PATTERN" | "SET_SLEEVE_PATTERN" | "SET_COLOR" | "SET_NN_FILL" }
>;

export const initialDesignState: DesignState = {
  bodyPatternId: "stripes-v1",
  sleevePatternId: "sleeve-plain",
  colors: { primary: "#0a5c36", secondary: "#ffffff", accent: "#f5b700", collar: "#ffffff" },
  logoDataUrl: null,
  crestConfig: null,
  sponsors: {},
  playerName: "",
  playerNumber: "",
  nameNumberStyle: initialNameNumberStyle(),
  projectName: "Mi diseño",
  shorts: { included: false, colorSource: "primary" },
  keeper: { included: false, look: null, nameNumberFill: null },
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

// The design as one of the two shirts wears it. Everything the keeper shares with the team
// (crest, sponsors, name, number, typeface) comes through unchanged.
export function lookFor(state: DesignState, target: LookTarget): DesignState {
  const { keeper } = state;
  if (target !== "keeper" || !keeper.included || !keeper.look) return state;
  return {
    ...state,
    ...keeper.look,
    nameNumberStyle: {
      ...state.nameNumberStyle,
      fill: keeper.nameNumberFill ?? contrastColor(keeper.look.colors.primary),
    },
  };
}

// Runs a look action against the keeper's shirt by applying it to the keeper-as-a-design and
// reading the look back, so patterns and colors follow the same rules as the team's.
function reduceKeeper(state: DesignState, action: LookAction): DesignState {
  const view = lookFor(state, "keeper");
  if (view === state) return state;
  // `target` is cleared so the action is applied to the view as a plain one, not routed back here.
  const next = designReducer(view, { ...action, target: undefined });
  if (next === view) return state;
  return {
    ...state,
    keeper: {
      ...state.keeper,
      look: { bodyPatternId: next.bodyPatternId, sleevePatternId: next.sleevePatternId, colors: next.colors },
      nameNumberFill: action.type === "SET_NN_FILL" ? next.nameNumberStyle.fill : state.keeper.nameNumberFill,
    },
  };
}

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  if ("target" in action && action.target === "keeper") return reduceKeeper(state, action);
  switch (action.type) {
    case "SET_BODY_PATTERN":
      return withPatternChange(state, "body", action.id);
    case "SET_SLEEVE_PATTERN":
      return withPatternChange(state, "sleeve", action.id);
    case "SET_COLOR":
      return { ...state, colors: { ...state.colors, [action.slot]: action.value } };
    case "SET_LOGO":
      return { ...state, logoDataUrl: action.dataUrl, crestConfig: null };
    case "SET_CREST_CONFIG":
      return findCrestShape(action.config.shapeId)
        ? { ...state, crestConfig: action.config, logoDataUrl: crestDataUrl(action.config) }
        : state;
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
        keeper: {
          included: state.keeper.included,
          look: state.keeper.included ? defaultKeeperLook(initialDesignState.colors) : null,
          nameNumberFill: null,
        },
      };
    case "SET_SHORTS_INCLUDED":
      return state.shorts.included === action.value
        ? state
        : { ...state, shorts: { ...state.shorts, included: action.value } };
    case "SET_KEEPER_INCLUDED":
      if (state.keeper.included === action.value) return state;
      return {
        ...state,
        keeper: {
          ...state.keeper,
          included: action.value,
          look: state.keeper.look ?? (action.value ? defaultKeeperLook(state.colors) : null),
        },
      };
    case "SET_SHORTS_COLOR_SOURCE":
      return SHORTS_COLOR_SOURCES.includes(action.value)
        ? { ...state, shorts: { ...state.shorts, colorSource: action.value } }
        : state;
    default:
      return state;
  }
}
