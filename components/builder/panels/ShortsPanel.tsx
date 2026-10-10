"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import type { ShortsColorSource } from "@/lib/builder/state/design-state";
import { PanelShell } from "./PanelShell";

const KIT_OPTIONS = [
  { included: false, label: "Solo camiseta" },
  { included: true, label: "Conjunto" },
] as const;

const COLOR_OPTIONS: { source: ShortsColorSource; label: string }[] = [
  { source: "primary", label: "Primario" },
  { source: "secondary", label: "Secundario" },
];

const OPTION = "flex items-center gap-3 rounded-2xl border-2 bg-white/70 p-3 text-left text-sm font-medium";

export function ShortsPanel() {
  const { state, dispatch } = useDesign();
  const { included, colorSource } = state.shorts;

  return (
    <PanelShell title="Pantalón" hint="El pantalón toma uno de los colores de la camiseta.">
      <div role="radiogroup" aria-label="Qué comprar" className="flex flex-col gap-3">
        {KIT_OPTIONS.map((option) => {
          const checked = included === option.included;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: option.included })}
              className={`${OPTION} ${checked ? "border-foreground" : "border-transparent hover:border-line"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {included && (
        <div role="radiogroup" aria-label="Color del pantalón" className="mt-5 flex flex-col gap-3">
          <p className="text-sm font-semibold">Color del pantalón</p>
          {COLOR_OPTIONS.map((option) => {
            const checked = colorSource === option.source;
            return (
              <button
                key={option.source}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => dispatch({ type: "SET_SHORTS_COLOR_SOURCE", value: option.source })}
                className={`${OPTION} ${checked ? "border-foreground" : "border-transparent hover:border-line"}`}
              >
                <span
                  data-swatch
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: state.colors[option.source] }}
                />
                <span className="flex flex-col">
                  {option.label}
                  <span className="font-mono text-xs uppercase text-muted">{state.colors[option.source]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
