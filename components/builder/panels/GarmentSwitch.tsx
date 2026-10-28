"use client";
import { useDesign } from "@/lib/builder/state/design-context";

const SHIRTS = [
  { target: "player", label: "Jugador", icon: "/icons/sections/kit-shirt-v2.webp" },
  { target: "keeper", label: "Arquero", icon: "/icons/sections/kit-gloves.webp" },
] as const;

// Says which shirt the panel below changes, and lets you swap it. Only while the keeper is in
// the order: with one shirt there is nothing to choose.
export function GarmentSwitch() {
  const { state, editing, setEditing } = useDesign();
  if (!state.keeper.included) return null;

  return (
    <div className="mb-4">
      <p id="garment-switch-label" className="mb-1.5 text-sm font-semibold">
        Editando
      </p>
      <div role="radiogroup" aria-labelledby="garment-switch-label" className="grid grid-cols-2 rounded-2xl bg-black/5 p-1">
        {SHIRTS.map(({ target, label, icon }) => (
          <button
            key={target}
            type="button"
            role="radio"
            aria-checked={editing === target}
            onClick={() => setEditing(target)}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
              editing === target ? "bg-foreground text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {/* Same square box for both images, whatever their proportions. */}
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center">
              <img src={icon} alt="" className="h-full w-full object-contain" />
            </span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// For the panels whose choices are the same on both shirts: no selector, only the reassurance.
export function SharedByBoth() {
  const { state } = useDesign();
  if (!state.keeper.included) return null;
  return <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium">Se aplica a las dos camisetas</p>;
}
