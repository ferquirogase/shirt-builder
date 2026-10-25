"use client";
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { SponsorSlotId } from "../catalog/sponsor-slots";
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
  /** Is the Sponsor panel open? Then the shirt shows a marker on each placement. */
  sponsorMarkers: boolean;
  setSponsorMarkers: (on: boolean) => void;
  /** The placement picked on the shirt or in the panel, if any. */
  selectedSponsor: SponsorSlotId | null;
  selectSponsor: (id: SponsorSlotId | null) => void;
  /** A card of the panel says here how to open its file chooser, so a marker can open it. Returns how to take it back. */
  registerSponsorUploader: (id: SponsorSlotId, open: () => void) => () => void;
  /** A tap on a marker: selects the placement and, if it is empty, opens its file chooser. */
  pickSponsor: (id: SponsorSlotId) => void;
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
  const keeperIn = history.present.keeper.included;
  // Taking the keeper out also forgets the choice: adding it back later starts on the player shirt.
  if (!keeperIn && wanted !== "player") setEditing("player");
  const editing: LookTarget = keeperIn ? wanted : "player";

  // Also UI state: the markers on the shirt and the Sponsor panel share them.
  const [sponsorMarkers, setSponsorMarkers] = useState(false);
  const [selectedSponsor, selectSponsor] = useState<SponsorSlotId | null>(null);
  const sponsorUploaders = useRef<Partial<Record<SponsorSlotId, () => void>>>({});
  const registerSponsorUploader = useCallback((id: SponsorSlotId, open: () => void) => {
    sponsorUploaders.current[id] = open;
    return () => {
      delete sponsorUploaders.current[id];
    };
  }, []);
  const sponsors = history.present.sponsors;
  // The file chooser has to open inside the tap that asked for it, so it is not left to an effect.
  const pickSponsor = useCallback(
    (id: SponsorSlotId) => {
      selectSponsor(id);
      if (!sponsors[id]) sponsorUploaders.current[id]?.();
    },
    [sponsors]
  );

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
      sponsorMarkers,
      setSponsorMarkers,
      selectedSponsor,
      selectSponsor,
      registerSponsorUploader,
      pickSponsor,
    }),
    [history, dispatch, editing, sponsorMarkers, selectedSponsor, pickSponsor]
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
