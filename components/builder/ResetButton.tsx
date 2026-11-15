"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { UndoIcon } from "./icons";

const RESET_LABEL = "Resetear diseño";
const ARMED_LABEL = "¿Seguro? Se pierden los cambios";

// Lives in the header, away from the shirt: over the stage a tap meant to turn the shirt could land on it.
export function ResetButton() {
  const { dispatch, canReset } = useDesign();
  // A reset throws the design away and the page has no undo, so it takes two clicks.
  const [confirming, setConfirming] = useState(false);
  const armed = confirming && canReset;

  return (
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
      className={`inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:px-4 ${
        armed ? "bg-foreground text-white" : "text-foreground/70 enabled:hover:bg-white/80 enabled:hover:text-foreground"
      }`}
    >
      <UndoIcon className="h-5 w-5" />
      {/* A phone shows the icon alone, until the button asks for confirmation: that has to be read. */}
      {armed ? (
        <span aria-hidden="true">
          ¿Seguro?<span className="hidden md:inline"> Se pierden los cambios</span>
        </span>
      ) : (
        <span aria-hidden="true" className="hidden md:inline">
          Resetear
        </span>
      )}
    </button>
  );
}
