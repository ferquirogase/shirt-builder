"use client";
import { useState } from "react";
import { useEditedLook } from "@/lib/builder/state/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/catalog/patterns";
import { colorsAfterPatternChange } from "@/lib/builder/state/design-state";
import { PatternGrid } from "../PatternGrid";
import { EditingBadge } from "./EditingBadge";
import { PanelShell } from "./PanelShell";

type Tab = "torso" | "mangas";
const TABS: { id: Tab; label: string }[] = [
  { id: "torso", label: "Torso" },
  { id: "mangas", label: "Mangas" },
];

export function DesignPanel() {
  const { view, dispatchLook } = useEditedLook();
  const [tab, setTab] = useState<Tab>("torso");
  const isTorso = tab === "torso";

  return (
    <PanelShell
      title="Diseño"
      hint={isTorso ? "Elegí un patrón para el torso." : "Elegí un patrón para las mangas."}
    >
      <EditingBadge />
      <div role="tablist" aria-label="Zona de la camiseta" className="mb-4 grid grid-cols-2 rounded-2xl bg-black/5 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={[
              "rounded-xl py-2 text-sm font-semibold transition",
              tab === id ? "bg-white shadow-sm" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
      <PatternGrid
        patterns={isTorso ? BODY_PATTERNS : SLEEVE_PATTERNS}
        selectedId={isTorso ? view.bodyPatternId : view.sleevePatternId}
        colorsFor={(p) => colorsAfterPatternChange(view, isTorso ? "body" : "sleeve", p.id)}
        onSelect={(id) =>
          dispatchLook(isTorso ? { type: "SET_BODY_PATTERN", id } : { type: "SET_SLEEVE_PATTERN", id })
        }
      />
    </PanelShell>
  );
}
