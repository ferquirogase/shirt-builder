"use client";
import { useEditedLook } from "@/lib/builder/state/design-context";
import { BODY_PATTERNS } from "@/lib/builder/catalog/patterns";
import { colorsAfterPatternChange } from "@/lib/builder/state/design-state";
import { PatternGrid } from "../PatternGrid";
import { PanelShell } from "./PanelShell";

// The sleeves have no design to choose: they wear their own color and a stripe at the edge, set in Colores.
export function DesignPanel() {
  const { view, dispatchLook } = useEditedLook();

  return (
    <PanelShell title="Diseño" hint="Elegí un patrón para el torso.">
      <PatternGrid
        patterns={BODY_PATTERNS}
        selectedId={view.bodyPatternId}
        colorsFor={(p) => colorsAfterPatternChange(view, p.id)}
        onSelect={(id) => dispatchLook({ type: "SET_BODY_PATTERN", id })}
      />
    </PanelShell>
  );
}
