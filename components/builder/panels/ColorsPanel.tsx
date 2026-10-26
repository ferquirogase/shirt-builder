"use client";
import { useState } from "react";
import { useDesign, useEditedLook } from "@/lib/builder/state/design-context";
import { formatCmyk } from "@/lib/builder/color/cmyk";
import { visibleColors } from "@/lib/builder/catalog/patterns";
import type { ShortsColorSource } from "@/lib/builder/state/design-state";
import type { ColorSlot } from "@/lib/builder/texture/svg-recolor";
import { EditingBadge } from "./EditingBadge";
import { ColorField } from "./ColorField";
import { PanelShell } from "./PanelShell";

const SHORTS_COLOR_OPTIONS: { source: ShortsColorSource; label: string }[] = [
  { source: "primary", label: "Color primario" },
  { source: "secondary", label: "Color secundario" },
];

export function ColorsPanel() {
  const { state, dispatch, editing } = useDesign();
  const { view, dispatchLook } = useEditedLook();
  // Which color's palette is open: one at a time, so the panel stays short.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>(null);
  const rows: { slot: ColorSlot; label: string }[] = [
    ...visibleColors(view.bodyPatternId, view.sleevePatternId).map((c) => ({ slot: c.role, label: c.label })),
    { slot: "collar", label: "Color del cuello" },
  ];

  return (
    <PanelShell title="Colores" hint="Los colores dependen del diseño elegido.">
      <EditingBadge />
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

      {state.shorts.included && editing === "player" && (
        <div className="mt-6">
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
        </div>
      )}
    </PanelShell>
  );
}
