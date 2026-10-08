"use client";
import { useDesign } from "@/lib/builder/design-context";
import { NAME_NUMBER_PRESETS, OUTLINE_COLOR, OUTLINE_WIDTH, getNameNumberPreset } from "@/lib/builder/name-number-presets";
import { CheckIcon } from "../icons";
import { PanelShell } from "./PanelShell";

const INPUT =
  "rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const COLOR_INPUT = "h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent";
const THUMB_FONT_PX = 28;

export function TextPanel() {
  const { state, dispatch } = useDesign();
  const style = state.nameNumberStyle;
  const selectedId = getNameNumberPreset(style.presetId).id;

  return (
    <PanelShell title="Nombre y número" hint="Se muestran en la espalda.">
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

        <div role="radiogroup" aria-label="Estilo" className="grid grid-cols-2 gap-2 md:gap-3">
          {NAME_NUMBER_PRESETS.map((preset) => {
            const selected = preset.id === selectedId;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => dispatch({ type: "SET_NN_PRESET", id: preset.id })}
                className={[
                  "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/70 p-2 text-xs font-medium transition md:p-3 md:text-sm",
                  selected ? "border-accent shadow-sm" : "border-transparent hover:border-line",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex aspect-square w-full items-center justify-center rounded-xl"
                  style={{
                    background: state.colors.primary,
                    color: style.fill,
                    fontFamily: `var(${preset.cssVar}), sans-serif`,
                    fontWeight: preset.weight,
                    fontSize: THUMB_FONT_PX,
                    WebkitTextStroke: style.outline ? `${OUTLINE_WIDTH * THUMB_FONT_PX}px ${OUTLINE_COLOR}` : undefined,
                    paintOrder: "stroke fill",
                  }}
                >
                  10
                </span>
                <span>{preset.label}</span>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-foreground">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Color del texto
          <input
            type="color"
            value={style.fill}
            onChange={(e) => dispatch({ type: "SET_NN_FILL", value: e.target.value })}
            className={COLOR_INPUT}
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Borde
          <input
            type="checkbox"
            checked={style.outline}
            onChange={(e) => dispatch({ type: "SET_NN_OUTLINE", value: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </div>
    </PanelShell>
  );
}
