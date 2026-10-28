"use client";
import { useDesign } from "@/lib/builder/state/design-context";

// For the panels whose choices are the same on both shirts: no choice to make, only the reassurance.
export function SharedByBoth() {
  const { state } = useDesign();
  if (!state.keeper.included) return null;
  return <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium">Se aplica a las dos camisetas</p>;
}
