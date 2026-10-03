"use client";
import type { ReactNode } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { DownloadIcon, RedoIcon, UndoIcon } from "./icons";

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

export function StageToolbar({ onDownload }: { onDownload: () => void }) {
  const { dispatch, canUndo, canRedo } = useDesign();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-3 px-4">
      <RoundButton label="Deshacer" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })}>
        <UndoIcon className="h-5 w-5" />
      </RoundButton>
      <RoundButton label="Rehacer" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })}>
        <RedoIcon className="h-5 w-5" />
      </RoundButton>
      <button
        type="button"
        aria-label="Descargar PNG"
        onClick={onDownload}
        className="pointer-events-auto absolute right-4 top-0 flex h-11 items-center gap-2 rounded-full bg-white/80 px-3 text-sm font-semibold shadow-sm transition hover:bg-white md:px-4"
      >
        <DownloadIcon className="h-5 w-5" />
        <span className="hidden md:inline">Descargar PNG</span>
      </button>
    </div>
  );
}
