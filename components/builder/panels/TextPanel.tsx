"use client";
import { useState } from "react";
import { useDesign, useEditedLook } from "@/lib/builder/state/design-context";
import { NAME_PLACEHOLDER, NUMBER_PLACEHOLDER } from "@/lib/builder/texture/number-text";
import { ColorField } from "./ColorField";
import { PanelShell } from "./PanelShell";

const INPUT =
  "rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";

export function TextPanel() {
  const { state, dispatch } = useDesign();
  const { view, editing, dispatchLook } = useEditedLook();
  const style = state.nameNumberStyle;
  // Which color's palette is open: one at a time, so the panel stays short.
  const [openField, setOpenField] = useState<"fill" | "outline" | null>(null);

  return (
    <PanelShell title="Nombre y número" hint="El nombre y el número van en la espalda. El número también va en el short.">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input
            type="text"
            placeholder={NAME_PLACEHOLDER}
            value={state.playerName}
            onChange={(e) => dispatch({ type: "SET_PLAYER_NAME", value: e.target.value.toUpperCase() })}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Número
          <input
            type="text"
            inputMode="numeric"
            placeholder={NUMBER_PLACEHOLDER}
            maxLength={2}
            value={state.playerNumber}
            onChange={(e) => dispatch({ type: "SET_PLAYER_NUMBER", value: e.target.value.replace(/\D/g, "") })}
            className={INPUT}
          />
        </label>

        {/* The title and the switch share the first row; the hint takes the full width below. */}
        <button
          type="button"
          role="switch"
          aria-checked={state.chestNumber}
          aria-labelledby="chest-number-label"
          aria-describedby="chest-number-hint"
          onClick={() => dispatch({ type: "SET_CHEST_NUMBER", value: !state.chestNumber })}
          className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-2xl border-2 bg-white/70 p-3 text-left text-sm font-medium ${
            state.chestNumber ? "border-foreground" : "border-transparent hover:border-line"
          }`}
        >
          <span id="chest-number-label" className="text-base font-semibold leading-tight">
            Número en el pecho
          </span>
          <span
            aria-hidden="true"
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              state.chestNumber ? "bg-foreground" : "bg-black/20"
            }`}
          >
            <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${state.chestNumber ? "translate-x-5" : ""}`} />
          </span>
          <span id="chest-number-hint" className="col-span-2 font-normal text-muted">
            Se imprime en lugar del sponsor 1.
          </span>
        </button>

        <ColorField
          label={editing === "keeper" ? "Color del texto (arquero)" : "Color del texto"}
          value={view.nameNumberStyle.fill}
          open={openField === "fill"}
          onOpenChange={(open) => setOpenField(open ? "fill" : null)}
          onChange={(value) => dispatchLook({ type: "SET_NN_FILL", value })}
        />
        <label className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={style.outline}
            onChange={(e) => dispatch({ type: "SET_NN_OUTLINE", value: e.target.checked })}
            className="h-5 w-5"
          />
          Borde
        </label>
        {/* The border's color is only asked for while there is a border, which saves a row. */}
        {style.outline && (
          <ColorField
            label="Color del borde"
            value={style.outlineColor}
            open={openField === "outline"}
            onOpenChange={(open) => setOpenField(open ? "outline" : null)}
            onChange={(value) => dispatch({ type: "SET_NN_OUTLINE_COLOR", value })}
          />
        )}
      </div>
    </PanelShell>
  );
}
