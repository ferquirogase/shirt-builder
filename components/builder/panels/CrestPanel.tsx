"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { useImageUpload } from "@/lib/builder/io/use-image-upload";
import { UploadIcon } from "../icons";
import { CrestCreator } from "./CrestCreator";
import { PanelShell } from "./PanelShell";

type Mode = "upload" | "create";
const MODES: { id: Mode; label: string }[] = [
  { id: "upload", label: "Subir el mío" },
  { id: "create", label: "Crear escudo" },
];

export function CrestPanel() {
  const { state, dispatch } = useDesign();
  const { error, handleFile, cancelPending } = useImageUpload((dataUrl) => dispatch({ type: "SET_LOGO", dataUrl }));
  const [mode, setMode] = useState<Mode>(state.crestConfig ? "create" : "upload");
  // The made crest changing from outside the creator (an undo, a removal) moves the panel to where
  // it can be seen: a made crest lives in the creator, anything else in the upload.
  const [seenCrest, setSeenCrest] = useState(state.crestConfig);
  if (seenCrest !== state.crestConfig) {
    setSeenCrest(state.crestConfig);
    setMode(state.crestConfig ? "create" : "upload");
  }

  // Opening the creator with no crest at all shows a first one at once; an uploaded crest is
  // only replaced when the user actually picks something in the creator.
  function choose(next: Mode) {
    setMode(next);
    if (next === "create" && !state.logoDataUrl) dispatch({ type: "SET_CREST_CONFIG", config: INITIAL_CREST });
  }

  return (
    <PanelShell
      title="Escudo"
      hint={mode === "upload" ? "PNG, JPG o SVG. Máximo 2 MB." : "Armá un escudo si todavía no tenés uno."}
    >
      <div role="tablist" aria-label="Origen del escudo" className="mb-4 grid grid-cols-2 rounded-2xl bg-black/5 p-1">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => choose(id)}
            className={[
              "rounded-xl py-2 text-sm font-semibold transition",
              mode === id ? "bg-white shadow-sm" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/70 p-6 text-sm font-medium hover:border-accent focus-within:ring-2 focus-within:ring-foreground/60">
            <UploadIcon className="h-7 w-7 text-muted" />
            <span>Subir escudo</span>
            <input
              type="file"
              aria-label="Subir escudo"
              accept="image/png,image/jpeg,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </>
      ) : (
        <CrestCreator />
      )}

      {state.logoDataUrl && (
        <button
          type="button"
          onClick={() => {
            cancelPending();
            dispatch({ type: "SET_LOGO", dataUrl: null });
            // With no crest left the creator has nothing to show.
            setMode("upload");
          }}
          className="mt-3 self-start rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-black/5"
        >
          Quitar escudo
        </button>
      )}
    </PanelShell>
  );
}
