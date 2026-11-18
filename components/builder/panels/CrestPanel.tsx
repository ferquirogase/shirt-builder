"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { useImageUpload } from "@/lib/builder/io/use-image-upload";
import { ShieldIcon, UploadIcon } from "../icons";
import { CrestCreator } from "./CrestCreator";
import { PanelShell } from "./PanelShell";
import { SharedByBoth } from "./SharedByBoth";

type Mode = "upload" | "create";
// Two ways to get a crest, as two cards to pick from: the step already has a row of tabs (Escudo,
// Sponsors) above, and a second row of the same tabs read as more navigation, not as a choice.
const MODES: { id: Mode; label: string; detail: string; Icon: typeof UploadIcon }[] = [
  { id: "upload", label: "Subir el mío", detail: "Tu escudo en imagen", Icon: UploadIcon },
  { id: "create", label: "Crear escudo", detail: "Forma, colores y símbolo", Icon: ShieldIcon },
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
      <SharedByBoth />
      <div role="radiogroup" aria-label="Origen del escudo" className="mb-4 grid grid-cols-2 gap-2">
        {MODES.map(({ id, label, detail, Icon }) => {
          const checked = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={label}
              onClick={() => choose(id)}
              className={[
                "flex min-w-0 flex-col items-start gap-2 rounded-2xl border-2 bg-white/70 p-3 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 active:bg-black/5",
                checked ? "border-accent bg-white shadow-sm" : "border-transparent hover:border-line",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  checked ? "bg-accent text-foreground" : "bg-black/5 text-muted",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold leading-tight">{label}</span>
                <span className="mt-0.5 text-xs leading-snug text-muted">{detail}</span>
              </span>
            </button>
          );
        })}
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
