"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { UndoIcon } from "../icons";

const SHIRTS = [
  { target: "player", label: "Jugador" },
  { target: "keeper", label: "Arquero" },
] as const;

export function StageToolbar() {
  const { state, dispatch, canReset, editing, setEditing } = useDesign();
  // A reset throws the design away and the page has no undo, so it takes two clicks.
  const [confirming, setConfirming] = useState(false);
  const armed = confirming && canReset;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-wrap items-center justify-center gap-2 px-4">
      {state.keeper.included && (
        <div
          role="radiogroup"
          aria-label="Camiseta"
          className="pointer-events-auto flex h-11 rounded-full bg-white/80 p-1 shadow-sm"
        >
          {SHIRTS.map(({ target, label }) => (
            <button
              key={target}
              type="button"
              role="radio"
              aria-checked={editing === target}
              onClick={() => setEditing(target)}
              className={`rounded-full px-4 text-sm font-semibold transition ${
                editing === target ? "bg-foreground text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={!canReset}
        onClick={() => {
          if (!armed) return setConfirming(true);
          setConfirming(false);
          dispatch({ type: "RESET_DESIGN" });
        }}
        onBlur={() => setConfirming(false)}
        className={`pointer-events-auto flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
          armed ? "bg-foreground text-white" : "bg-white/80 hover:bg-white"
        }`}
      >
        <UndoIcon className="h-5 w-5" />
        {armed ? "¿Seguro? Se pierden los cambios" : "Resetear diseño"}
      </button>
    </div>
  );
}
