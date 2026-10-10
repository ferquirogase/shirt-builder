"use client";
import type { ReactNode } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { RedoIcon, UndoIcon } from "../icons";

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function StageToolbar() {
  const { dispatch, canUndo, canRedo } = useDesign();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-3 px-4">
      <RoundButton label="Deshacer" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })}>
        <UndoIcon className="h-5 w-5" />
      </RoundButton>
      <RoundButton label="Rehacer" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })}>
        <RedoIcon className="h-5 w-5" />
      </RoundButton>
    </div>
  );
}
