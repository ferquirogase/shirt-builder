"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { UndoIcon } from "../icons";

const SHIRTS = [
  { target: "player", label: "Jugador", icon: "/icons/sections/kit-shirt-v2.webp" },
  { target: "keeper", label: "Arquero", icon: "/icons/sections/kit-gloves.webp" },
] as const;

const RESET_LABEL = "Resetear diseño";
const ARMED_LABEL = "¿Seguro? Se pierden los cambios";

export function StageToolbar() {
  const { state, dispatch, canReset, editing, setEditing } = useDesign();
  // A reset throws the design away and the page has no undo, so it takes two clicks.
  const [confirming, setConfirming] = useState(false);
  const armed = confirming && canReset;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-wrap items-center justify-center gap-2 px-3 sm:px-4">
      {state.keeper.included && (
        <div
          role="radiogroup"
          aria-label="Camiseta"
          className="pointer-events-auto flex h-11 rounded-full bg-white/80 p-1 shadow-sm"
        >
          {SHIRTS.map(({ target, label, icon }) => (
            <button
              key={target}
              type="button"
              role="radio"
              aria-checked={editing === target}
              onClick={() => setEditing(target)}
              className={`flex items-center gap-1 rounded-full pl-1.5 pr-3 text-sm sm:gap-1.5 sm:pl-2 sm:pr-4 font-semibold transition ${
                editing === target ? "bg-foreground text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {/* Same square box for both images, whatever their proportions. */}
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
                <img src={icon} alt="" className="h-full w-full object-contain" />
              </span>
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
        aria-label={armed ? ARMED_LABEL : RESET_LABEL}
        className={`pointer-events-auto flex h-11 items-center gap-1.5 rounded-full px-3 text-sm sm:gap-2 sm:px-4 font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
          armed ? "bg-foreground text-white" : "bg-white/80 hover:bg-white"
        }`}
      >
        <UndoIcon className="h-5 w-5" />
        {/* A phone has no room for the full text next to the shirt switch, so it keeps it all on one line. */}
        <span className="sm:hidden">{armed ? "¿Seguro?" : "Resetear"}</span>
        <span className="hidden sm:inline">{armed ? ARMED_LABEL : RESET_LABEL}</span>
      </button>
    </div>
  );
}
