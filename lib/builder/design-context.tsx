"use client";
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { designReducer, initialDesignState, type DesignAction, type DesignState } from "./design-state";

type DesignContextValue = {
  state: DesignState;
  dispatch: Dispatch<DesignAction>;
};

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(designReducer, initialDesignState);
  return <DesignContext.Provider value={{ state, dispatch }}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return ctx;
}
