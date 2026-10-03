"use client";
import { useDesign } from "@/lib/builder/design-context";
import type { ColorSlot } from "@/lib/builder/svg-recolor";
import { PanelShell } from "./PanelShell";

const SLOTS: { slot: ColorSlot; label: string }[] = [
  { slot: "primary", label: "Color primario" },
  { slot: "secondary", label: "Color secundario" },
];

export function ColorsPanel() {
  const { state, dispatch } = useDesign();
  return (
    <PanelShell title="Colores" hint="Los colores se aplican a todos los patrones.">
      <div className="flex flex-col gap-3">
        {SLOTS.map(({ slot, label }) => (
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
