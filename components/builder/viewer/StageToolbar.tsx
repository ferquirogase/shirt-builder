"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { UndoIcon } from "../icons";

const RESET_LABEL = "Resetear diseño";
const ARMED_LABEL = "¿Seguro? Se pierden los cambios";

export function StageToolbar() {
  const { dispatch, canReset } = useDesign();
  // A reset throws the design away and the page has no undo, so it takes two clicks.
  const [confirming, setConfirming] = useState(false);
  const armed = confirming && canReset;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-wrap items-center justify-center gap-2 px-3 sm:px-4">
      <button
        type="button"
        disabled={!canReset}
        onClick={() => {
          if (!armed) return setConfirming(true);
          setConfirming(false);
          dispatch({ type: "RESET_DESIGN" });
        }}
        onBlur={() => setConfirming(false)}
        aria-label={armed ? ARMED_LABEL : RESET_LABEL}
        className={`pointer-events-auto flex h-11 items-center gap-1.5 rounded-full px-3 text-sm sm:gap-2 sm:px-4 font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
          armed ? "bg-foreground text-white" : "bg-white/80 hover:bg-white"
        }`}
      >
        <UndoIcon className="h-5 w-5" />
        {/* A phone keeps it all on one line. */}
        <span className="sm:hidden">{armed ? "¿Seguro?" : "Resetear"}</span>
        <span className="hidden sm:inline">{armed ? ARMED_LABEL : RESET_LABEL}</span>
      </button>
    </div>
  );
}
