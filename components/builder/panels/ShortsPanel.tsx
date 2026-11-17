"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { SHORTS_PATTERNS, shortsColorsFor, type ShortsRole } from "@/lib/builder/catalog/shorts-patterns";
import { formatMoney, PRICE_PER_SHORTS } from "@/lib/checkout/pricing";
import { CheckIcon } from "../icons";
import { ShortsPatternThumb } from "../ShortsPatternThumb";
import { AddGarmentCard, RemoveGarmentButton } from "./AddGarmentCard";
import { ColorField } from "./ColorField";
import { PanelShell } from "./PanelShell";

type Tab = "diseno" | "colores";
const TABS: { id: Tab; label: string }[] = [
  { id: "diseno", label: "Diseño" },
  { id: "colores", label: "Colores" },
];

// The shorts: a design of their own (the owners' moldes) and colors of their own, never the shirt's.
export function ShortsPanel() {
  const { state, dispatch } = useDesign();
  const [tab, setTab] = useState<Tab>("diseno");
  // Which color's palette is open: one at a time, so the panel stays short.
  const [openSlot, setOpenSlot] = useState<ShortsRole | null>(null);

  if (!state.shorts.included) {
    return (
      <section aria-label="Short">
        <h2 className="sr-only">Short</h2>
        <AddGarmentCard
          icon="/icons/sections/kit-kit.webp"
          title="Short"
          description={`Diseño y colores propios. Suma ${formatMoney(PRICE_PER_SHORTS)} por jugador.`}
          addLabel="Sumar short"
          onAdd={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: true })}
        />
      </section>
    );
  }

  const { patternId, colors } = state.shorts;

  return (
    <>
      <div className="px-5 pt-4">
        <div role="tablist" aria-label="Qué cambiar del short" className="grid grid-cols-2 rounded-2xl bg-black/5 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-9 rounded-xl px-1 text-[13px] font-medium transition ${
                tab === id ? "bg-white font-semibold shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "diseno" && (
        <PanelShell title="Diseño" hint="El número del jugador también va en el short.">
          <div role="radiogroup" aria-label="Diseño del short" className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-3">
            {SHORTS_PATTERNS.map((pattern) => {
              const selected = pattern.id === patternId;
              return (
                <button
                  key={pattern.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={pattern.label}
                  onClick={() => dispatch({ type: "SET_SHORTS_PATTERN", id: pattern.id })}
                  className={[
                    "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/70 p-2 text-xs font-medium transition md:p-3 md:text-sm",
                    selected ? "border-accent shadow-sm" : "border-transparent hover:border-line",
                  ].join(" ")}
                >
                  <ShortsPatternThumb patternId={pattern.id} colors={colors} />
                  <span>{pattern.label}</span>
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-foreground">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </PanelShell>
      )}

      {tab === "colores" && (
        <PanelShell title="Colores" hint="Los colores del short son propios: no cambian con los de la camiseta.">
          <div className="flex flex-col gap-3">
            {shortsColorsFor(patternId).map(({ role, label }) => (
              <ColorField
                key={role}
                label={label}
                value={colors[role]}
                open={openSlot === role}
                onOpenChange={(open) => setOpenSlot(open ? role : null)}
                onChange={(value) => dispatch({ type: "SET_SHORTS_COLOR", slot: role, value })}
              />
            ))}
          </div>
        </PanelShell>
      )}

      <div className="flex flex-col">
        <RemoveGarmentButton label="Quitar short" onRemove={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: false })} />
      </div>
    </>
  );
}
