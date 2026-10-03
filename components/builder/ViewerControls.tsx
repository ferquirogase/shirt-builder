"use client";
import type { ViewSide } from "@/lib/builder/camera-math";
import { HandIcon, RotateIcon } from "./icons";

type Props = {
  view: ViewSide;
  onViewChange: (view: ViewSide) => void;
  onReset: () => void;
  showHint: boolean;
};

const SIDES: { id: ViewSide; label: string }[] = [
  { id: "front", label: "Frente" },
  { id: "back", label: "Espalda" },
];

export function ViewerControls({ view, onViewChange, onReset, showHint }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2">
      <div className="pointer-events-auto flex items-center gap-3">
        <div role="group" aria-label="Vista" className="flex rounded-full bg-white/80 p-1 shadow-sm">
          {SIDES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => onViewChange(id)}
              className={[
                "rounded-full px-5 py-2 text-sm font-semibold transition",
                view === id ? "bg-accent" : "text-foreground/80 hover:bg-black/5",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Restablecer vista"
          onClick={onReset}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
        >
          <RotateIcon className="h-5 w-5" />
        </button>
      </div>
      {showHint && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <HandIcon className="h-4 w-4" />
          Arrastrá para girar
        </p>
      )}
    </div>
  );
}
