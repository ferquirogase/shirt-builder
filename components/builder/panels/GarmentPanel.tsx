"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { SizeGuideDialog } from "@/components/size-guide/SizeGuideDialog";
import { AddGarmentCard, RemoveGarmentButton } from "./AddGarmentCard";
import { ColorsPanel } from "./ColorsPanel";
import { DesignPanel } from "./DesignPanel";
import { TextPanel } from "./TextPanel";

type Tab = "diseno" | "colores" | "texto";
const TABS: { id: Tab; label: string }[] = [
  { id: "diseno", label: "Diseño" },
  { id: "colores", label: "Colores" },
  { id: "texto", label: "Nombre" },
];

// One shirt, whichever it is: the menu picked the shirt, so these tabs are always the same three.
// The shirt being edited is the one the viewer shows (`editing`), which the menu sets.
export function GarmentPanel({ garment }: { garment: "player" | "keeper" }) {
  const { state, dispatch, setEditing } = useDesign();
  const [tab, setTab] = useState<Tab>("diseno");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  if (garment === "keeper" && !state.keeper.included) {
    return (
      <section aria-label="Camiseta arquero">
        <h2 className="sr-only">Camiseta arquero</h2>
        <AddGarmentCard
          icon="/icons/sections/kit-gloves.webp"
          title="Camiseta de arquero"
          description="Colores y patrón propios. Comparte escudo y sponsors."
          addLabel="Sumar camiseta de arquero"
          onAdd={() => {
            dispatch({ type: "SET_KEEPER_INCLUDED", value: true });
            // Adding the keeper shows its shirt at once, so the effect of the button is seen.
            setEditing("keeper");
          }}
        />
      </section>
    );
  }

  return (
    <>
      {/* One row: the tabs and the size chart, so no band of the panel is spent on either. */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <div role="tablist" aria-label="Qué cambiar" className="grid flex-1 grid-cols-3 rounded-2xl bg-black/5 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-9 rounded-xl text-sm font-medium transition ${
                tab === id ? "bg-white font-semibold shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSizeGuideOpen(true)}
          className="inline-flex h-11 shrink-0 items-center rounded-full border border-foreground/80 bg-white/70 px-3 text-sm font-semibold hover:bg-accent-soft"
        >
          Ver talles
        </button>
      </div>
      <SizeGuideDialog open={sizeGuideOpen} withShorts={state.shorts.included} onClose={() => setSizeGuideOpen(false)} />
      {tab === "diseno" && <DesignPanel />}
      {tab === "colores" && <ColorsPanel />}
      {tab === "texto" && <TextPanel />}
      {garment === "keeper" && (
        <div className="flex flex-col">
          <RemoveGarmentButton
            label="Quitar camiseta de arquero"
            onRemove={() => dispatch({ type: "SET_KEEPER_INCLUDED", value: false })}
          />
        </div>
      )}
    </>
  );
}
