"use client";
import { useDesign, useEditedLook } from "@/lib/builder/state/design-context";
import { PanelShell } from "./PanelShell";

const INPUT =
  "rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const COLOR_INPUT = "h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent";

export function TextPanel() {
  const { state, dispatch } = useDesign();
  const { view, editing, dispatchLook } = useEditedLook();
  const style = state.nameNumberStyle;

  return (
    <PanelShell title="Nombre y número" hint="El nombre y el número van en la espalda. El número también va en el short.">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input
            type="text"
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

        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          {editing === "keeper" ? "Color del texto (arquero)" : "Color del texto"}
          <input
            type="color"
            value={view.nameNumberStyle.fill}
            onChange={(e) => dispatchLook({ type: "SET_NN_FILL", value: e.target.value })}
            className={COLOR_INPUT}
          />
        </label>
        <div className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              checked={style.outline}
              onChange={(e) => dispatch({ type: "SET_NN_OUTLINE", value: e.target.checked })}
              className="h-5 w-5"
            />
            Borde
          </label>
          {/* The color is only asked for while there is a border, which saves a row. */}
          {style.outline && (
            <input
              type="color"
              aria-label="Color del borde"
              value={style.outlineColor}
              onChange={(e) => dispatch({ type: "SET_NN_OUTLINE_COLOR", value: e.target.value })}
              className={COLOR_INPUT}
            />
          )}
        </div>
      </div>
    </PanelShell>
  );
}
