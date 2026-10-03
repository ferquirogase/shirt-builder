"use client";
import { useDesign } from "@/lib/builder/design-context";
import { PanelShell } from "./PanelShell";

export function SponsorPanel() {
  const { state, dispatch } = useDesign();
  return (
    <PanelShell title="Sponsor" hint="Aparece en el frente de la camiseta.">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Texto del sponsor
        <input
          type="text"
          value={state.sponsorText}
          onChange={(e) => dispatch({ type: "SET_SPONSOR_TEXT", value: e.target.value })}
          className="rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        />
      </label>
    </PanelShell>
  );
}
