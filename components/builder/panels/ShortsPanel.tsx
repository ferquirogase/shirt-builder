"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import { formatCmyk } from "@/lib/builder/color/cmyk";
import type { ShortsColorSource } from "@/lib/builder/state/design-state";
import { formatMoney, PRICE_PER_SHORTS } from "@/lib/checkout/pricing";
import { AddGarmentCard, RemoveGarmentButton } from "./AddGarmentCard";
import { PanelShell } from "./PanelShell";

const SHORTS_COLOR_OPTIONS: { source: ShortsColorSource; label: string }[] = [
  { source: "primary", label: "Color primario" },
  { source: "secondary", label: "Color secundario" },
];

export function ShortsPanel() {
  const { state, dispatch } = useDesign();

  if (!state.shorts.included) {
    return (
      <section aria-label="Short">
        <h2 className="sr-only">Short</h2>
        <AddGarmentCard
          icon="/icons/sections/kit-kit.webp"
          title="Short"
          description={`Va con los colores de la camiseta. Suma ${formatMoney(PRICE_PER_SHORTS)} por jugador.`}
          addLabel="Sumar short"
          onAdd={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: true })}
        />
      </section>
    );
  }

  return (
    <>
      <PanelShell title="Short" hint="El número del jugador también va en el short.">
        <p id="shorts-color-title" className="mb-3 text-sm font-semibold">
          Color del short
        </p>
        <div role="radiogroup" aria-labelledby="shorts-color-title" className="flex flex-col gap-3">
          {SHORTS_COLOR_OPTIONS.map((option) => {
            const checked = state.shorts.colorSource === option.source;
            return (
              <button
                key={option.source}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => dispatch({ type: "SET_SHORTS_COLOR_SOURCE", value: option.source })}
                className={`flex items-center gap-3 rounded-2xl border-2 bg-white/70 p-3 text-left text-sm font-medium ${
                  checked ? "border-foreground" : "border-transparent hover:border-line"
                }`}
              >
                <span
                  data-swatch
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: state.colors[option.source] }}
                />
                <span className="flex flex-col">
                  {option.label}
                  <span className="font-mono text-xs text-muted">{formatCmyk(state.colors[option.source])}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PanelShell>
      <div className="flex flex-col">
        <RemoveGarmentButton label="Quitar short" onRemove={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: false })} />
      </div>
    </>
  );
}
