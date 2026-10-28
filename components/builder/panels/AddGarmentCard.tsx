"use client";
import type { ReactNode } from "react";

type Props = {
  icon: string;
  title: string;
  description: ReactNode;
  addLabel: string;
  onAdd: () => void;
};

// What a garment that is not in the order yet shows instead of its panel: what it is and one
// button to add it. Its entry in the menu says "Sumar", so the way here is always visible.
export function AddGarmentCard({ icon, title, description, addLabel, onAdd }: Props) {
  const id = `add-${addLabel.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col items-center gap-3 p-5 text-center">
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center">
        <img src={icon} alt="" className="h-full w-full object-contain" />
      </span>
      <p className="text-base font-semibold">{title}</p>
      <p id={id} className="text-sm font-normal text-muted">
        {description}
      </p>
      <button
        type="button"
        aria-describedby={id}
        onClick={onAdd}
        className="inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-white"
      >
        {addLabel}
      </button>
    </div>
  );
}

// The way out of an added garment: quiet, at the end of its panel.
export function RemoveGarmentButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} className="mx-5 mb-5 self-start text-sm font-medium text-muted underline hover:text-foreground">
      {label}
    </button>
  );
}
