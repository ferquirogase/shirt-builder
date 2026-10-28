"use client";
import { useEditedLook } from "@/lib/builder/state/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/catalog/patterns";
import { colorsAfterPatternChange } from "@/lib/builder/state/design-state";
import { PatternGrid } from "../PatternGrid";
import { PanelShell } from "./PanelShell";

// Torso and sleeves are two tabs of the garment panel, not a second row of tabs under it.
export function DesignPanel({ zone }: { zone: "torso" | "mangas" }) {
  const { view, dispatchLook } = useEditedLook();
  const isTorso = zone === "torso";

  return (
    <PanelShell
      title="Diseño"
      hint={isTorso ? "Elegí un patrón para el torso." : "Elegí un patrón para las mangas."}
    >
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
