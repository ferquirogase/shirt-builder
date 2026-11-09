"use client";
import { useState } from "react";
import { useEditedLook } from "@/lib/builder/state/design-context";
import { visibleColors } from "@/lib/builder/catalog/patterns";
import type { ColorSlot } from "@/lib/builder/texture/svg-recolor";
import { ColorField } from "./ColorField";
import { PanelShell } from "./PanelShell";

type Row = { slot: ColorSlot; label: string };

export function ColorsPanel() {
  const { view, dispatchLook } = useEditedLook();
  // Which color's palette is open: one at a time, so the panel stays short.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>(null);
  const groups: { title: string; rows: Row[] }[] = [
    { title: "Torso", rows: visibleColors(view.bodyPatternId).map((c) => ({ slot: c.role, label: c.label })) },
    { title: "Cuello", rows: [{ slot: "collar", label: "Color del cuello" }] },
    {
      title: "Mangas",
      rows: [
        { slot: "sleeve", label: "Color de las mangas" },
        { slot: "sleeveTrim", label: "Color de la franja" },
      ],
    },
  ];

  return (
    <PanelShell title="Colores" hint="Los colores del torso dependen del diseño elegido.">
      <div className="flex flex-col gap-5">
        {groups.map(({ title, rows }) => (
          <section key={title} aria-label={title} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{title}</h3>
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
          </section>
        ))}
      </div>
    </PanelShell>
  );
}
