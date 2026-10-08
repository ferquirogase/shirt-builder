"use client";
import { useDesign } from "@/lib/builder/design-context";
import { useImageUpload } from "@/lib/builder/use-image-upload";
import { UploadIcon } from "../icons";
import { PanelShell } from "./PanelShell";

export function CrestPanel() {
  const { state, dispatch } = useDesign();
  const { error, handleFile, cancelPending } = useImageUpload((dataUrl) => dispatch({ type: "SET_LOGO", dataUrl }));

  return (
    <PanelShell title="Escudo" hint="PNG, JPG o SVG. Máximo 2 MB.">
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
      {state.logoDataUrl && (
        <button
          type="button"
          onClick={() => {
            cancelPending();
            dispatch({ type: "SET_LOGO", dataUrl: null });
          }}
          className="mt-3 self-start rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-black/5"
        >
          Quitar escudo
        </button>
      )}
    </PanelShell>
  );
}
