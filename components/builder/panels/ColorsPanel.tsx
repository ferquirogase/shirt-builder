"use client";
import { useDesign } from "@/lib/builder/design-context";
import { visibleColors } from "@/lib/builder/patterns";
import type { ColorSlot } from "@/lib/builder/svg-recolor";
import { PanelShell } from "./PanelShell";

export function ColorsPanel() {
  const { state, dispatch } = useDesign();
  const rows: { slot: ColorSlot; label: string }[] = [
    ...visibleColors(state.bodyPatternId, state.sleevePatternId).map((c) => ({ slot: c.role, label: c.label })),
    { slot: "collar", label: "Color del cuello" },
  ];

  return (
    <PanelShell title="Colores" hint="Los colores dependen del diseño elegido.">
      <div className="flex flex-col gap-3">
        {rows.map(({ slot, label }) => (
          <label key={slot} className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
            <span className="flex flex-col">
              {label}
              <span className="font-mono text-xs uppercase text-muted">{state.colors[slot]}</span>
            </span>
            <input
              type="color"
              aria-label={label}
              value={state.colors[slot]}
              onChange={(e) => dispatch({ type: "SET_COLOR", slot, value: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent"
            />
          </label>
        ))}
      </div>
    </PanelShell>
  );
}
