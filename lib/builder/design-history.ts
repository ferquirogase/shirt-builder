import { designReducer, initialDesignState, type DesignAction, type DesignState } from "./design-state";

export const HISTORY_LIMIT = 100;
// Edits of the same field closer together than this collapse into one undo step.
export const GROUP_WINDOW_MS = 500;

export type TimedDesignAction = DesignAction & { at?: number };
export type DesignDispatchAction = DesignAction | { type: "UNDO" } | { type: "REDO" };
export type HistoryAction = TimedDesignAction | { type: "UNDO" } | { type: "REDO" };

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
  switch (action.type) {
    case "SET_COLOR":
      return `color:${action.slot}`;
    case "SET_SPONSOR_TEXT":
      return "sponsor";
    case "SET_PLAYER_NAME":
      return "name";
    case "SET_PLAYER_NUMBER":
      return "number";
    default:
      return null;
  }
}

function sameDesign(a: DesignState, b: DesignState): boolean {
  return (
    a.bodyPatternId === b.bodyPatternId &&
    a.sleevePatternId === b.sleevePatternId &&
    a.colors.primary === b.colors.primary &&
    a.colors.secondary === b.colors.secondary &&
    a.logoDataUrl === b.logoDataUrl &&
    a.sponsorText === b.sponsorText &&
    a.playerName === b.playerName &&
    a.playerNumber === b.playerNumber &&
    a.projectName === b.projectName
  );
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
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
