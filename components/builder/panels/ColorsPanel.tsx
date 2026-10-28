"use client";
import { useState } from "react";
import { useEditedLook } from "@/lib/builder/state/design-context";
import { visibleColors } from "@/lib/builder/catalog/patterns";
import type { ColorSlot } from "@/lib/builder/texture/svg-recolor";
import { ColorField } from "./ColorField";
import { PanelShell } from "./PanelShell";

export function ColorsPanel() {
  const { view, dispatchLook } = useEditedLook();
  // Which color's palette is open: one at a time, so the panel stays short.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>(null);
  const rows: { slot: ColorSlot; label: string }[] = [
    ...visibleColors(view.bodyPatternId, view.sleevePatternId).map((c) => ({ slot: c.role, label: c.label })),
    { slot: "collar", label: "Color del cuello" },
  ];

  return (
    <PanelShell title="Colores" hint="Los colores dependen del diseño elegido.">
      <div className="flex flex-col gap-3">
        {rows.map(({ slot, label }) => (
          <ColorField
            key={slot}
            label={label}
            value={view.colors[slot]}
            open={openSlot === slot}
            onOpenChange={(open) => setOpenSlot(open ? slot : null)}
            onChange={(value) => dispatchLook({ type: "SET_COLOR", slot, value })}
          />
        ))}
      </div>

    </PanelShell>
  );
}
