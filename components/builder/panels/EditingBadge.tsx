"use client";
import { useDesign } from "@/lib/builder/state/design-context";

// Reminds which shirt a panel is changing, only while that is the keeper's.
export function EditingBadge() {
  const { editing } = useDesign();
  if (editing !== "keeper") return null;
  return (
    <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium">Editando la camiseta del arquero</p>
  );
}
