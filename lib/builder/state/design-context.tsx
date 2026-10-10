"use client";
import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from "react";
import { canResetDesign, createHistory, historyReducer, type DesignDispatchAction, type HistoryAction } from "./design-history";
import { lookFor, type DesignState, type LookAction, type LookTarget } from "./design-state";

export type DesignContextValue = {
  state: DesignState;
  dispatch: (action: DesignDispatchAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  /** Which shirt the viewer shows and the panels edit. Always "player" while the keeper is out of the order. */
  editing: LookTarget;
  setEditing: (target: LookTarget) => void;
  /** The design as the shirt being shown wears it: what the viewer draws. */
  viewed: DesignState;
};

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [history, rawDispatch] = useReducer(historyReducer, undefined, () => createHistory());

  // Timestamps are attached here (not in the reducer) so the reducer stays pure.
  const dispatch = useCallback((action: DesignDispatchAction) => {
    const timed: HistoryAction =
      action.type === "UNDO" || action.type === "REDO" || action.type === "LOAD_DESIGN"
        ? action
        : { ...action, at: Date.now() };
    rawDispatch(timed);
  }, []);

  // UI state, not part of the design: it is not undone and is not saved with an order.
  const [wanted, setEditing] = useState<LookTarget>("player");
  const editing: LookTarget = history.present.keeper.included ? wanted : "player";

  const value = useMemo<DesignContextValue>(
    () => ({
      state: history.present,
      dispatch,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      canReset: canResetDesign(history.present),
      editing,
      setEditing,
      viewed: lookFor(history.present, editing),
    }),
    [history, dispatch, editing]
  );

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return ctx;
}

// What a panel that edits "the shirt" needs: that shirt's design and a dispatch aimed at it.
export function useEditedLook() {
  const { dispatch, editing, viewed } = useDesign();
  const dispatchLook = useCallback(
    (action: LookAction) => dispatch(editing === "keeper" ? { ...action, target: "keeper" } : action),
    [dispatch, editing]
  );
  return { view: viewed, editing, dispatchLook };
}
