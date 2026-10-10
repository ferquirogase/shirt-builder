"use client";
import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { canResetDesign, createHistory, historyReducer, type DesignDispatchAction, type HistoryAction } from "./design-history";
import type { DesignState } from "./design-state";

export type DesignContextValue = {
  state: DesignState;
  dispatch: (action: DesignDispatchAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
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

  const value = useMemo<DesignContextValue>(
    () => ({
      state: history.present,
      dispatch,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      canReset: canResetDesign(history.present),
    }),
    [history, dispatch]
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
