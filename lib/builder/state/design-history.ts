import { SPONSOR_SLOTS, type SponsorMap } from "../catalog/sponsor-slots";
import { designReducer, initialDesignState, type DesignAction, type DesignState } from "./design-state";

export const HISTORY_LIMIT = 100;
// Edits of the same field closer together than this collapse into one undo step.
export const GROUP_WINDOW_MS = 500;

export type TimedDesignAction = DesignAction & { at?: number };
export type DesignDispatchAction =
  | DesignAction
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD_DESIGN"; design: DesignState };
export type HistoryAction =
  | TimedDesignAction
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD_DESIGN"; design: DesignState };

export type HistoryState = {
  past: DesignState[];
  present: DesignState;
  future: DesignState[];
  lastGroup: string | null;
  lastAt: number;
};

export function createHistory(initial: DesignState = initialDesignState): HistoryState {
  return { past: [], present: initial, future: [], lastGroup: null, lastAt: 0 };
}

// Continuous inputs (color pickers, text fields) get a group key so a burst of
// edits is one undo step. Discrete choices (patterns, logo) return null.
function groupKey(action: DesignAction): string | null {
  const who = "target" in action && action.target === "keeper" ? "keeper:" : "";
  switch (action.type) {
    case "SET_COLOR":
      return `${who}color:${action.slot}`;
    case "SET_SPONSOR_SCALE":
      return `sponsor-scale:${action.slot}`;
    case "SET_CREST_CONFIG":
      return "crest";
    case "SET_PLAYER_NAME":
      return "name";
    case "SET_PLAYER_NUMBER":
      return "number";
    case "SET_NN_FILL":
      return `${who}nn:fill`;
    default:
      return null;
  }
}

function sameSponsors(a: SponsorMap, b: SponsorMap): boolean {
  return SPONSOR_SLOTS.every(({ id }) => a[id]?.dataUrl === b[id]?.dataUrl && a[id]?.scale === b[id]?.scale);
}

function sameDesign(a: DesignState, b: DesignState): boolean {
  return (
    a.bodyPatternId === b.bodyPatternId &&
    a.sleevePatternId === b.sleevePatternId &&
    a.colors.primary === b.colors.primary &&
    a.colors.secondary === b.colors.secondary &&
    a.colors.accent === b.colors.accent &&
    a.colors.collar === b.colors.collar &&
    a.logoDataUrl === b.logoDataUrl &&
    JSON.stringify(a.crestConfig) === JSON.stringify(b.crestConfig) &&
    sameSponsors(a.sponsors, b.sponsors) &&
    a.playerName === b.playerName &&
    a.playerNumber === b.playerNumber &&
    a.nameNumberStyle.presetId === b.nameNumberStyle.presetId &&
    a.nameNumberStyle.fill === b.nameNumberStyle.fill &&
    a.nameNumberStyle.outline === b.nameNumberStyle.outline &&
    a.shorts.included === b.shorts.included &&
    a.keeper.included === b.keeper.included &&
    a.keeper.nameNumberFill === b.keeper.nameNumberFill &&
    JSON.stringify(a.keeper.look) === JSON.stringify(b.keeper.look) &&
    a.shorts.colorSource === b.shorts.colorSource &&
    a.projectName === b.projectName
  );
}

// Whether a reset would change anything: false on a design that is already the starting one.
export function canResetDesign(design: DesignState): boolean {
  return !sameDesign(designReducer(design, { type: "RESET_DESIGN" }), design);
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  // Opening a saved design starts a clean history: it is not an edit to undo.
  if (action.type === "LOAD_DESIGN") return createHistory(action.design);

  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      // The project name is not part of the history: carry the current one over.
      present: { ...previous, projectName: state.present.projectName },
      future: [state.present, ...state.future],
      lastGroup: null,
      lastAt: 0,
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const [next, ...rest] = state.future;
    return {
      past: [...state.past, state.present],
      present: { ...next, projectName: state.present.projectName },
      future: rest,
      lastGroup: null,
      lastAt: 0,
    };
  }

  const at = action.at ?? 0;
  const designAction = action as DesignAction;

  if (designAction.type === "SET_PROJECT_NAME") {
    return { ...state, present: designReducer(state.present, designAction) };
  }

  const next = designReducer(state.present, designAction);
  if (sameDesign(next, state.present)) return state;

  const group = groupKey(designAction);
  const continuing = group !== null && group === state.lastGroup && at - state.lastAt <= GROUP_WINDOW_MS;
  if (continuing) {
    return { ...state, present: next, future: [], lastAt: at };
  }

  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastGroup: group,
    lastAt: at,
  };
}
