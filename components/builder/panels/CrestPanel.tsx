"use client";
import { useRef, useState } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { loadImage } from "@/lib/builder/image-loader";
import { readAsDataUrl, validateLogoFile } from "@/lib/builder/logo-upload";
import { UploadIcon } from "../icons";
import { PanelShell } from "./PanelShell";

export function CrestPanel() {
  const { state, dispatch } = useDesign();
  const [error, setError] = useState<string | null>(null);
  // Only the latest upload may update the design, even if an older one
  // finishes reading/decoding later.
  const latestRequest = useRef(0);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const request = ++latestRequest.current;
    try {
      const dataUrl = await readAsDataUrl(file);
      // The type check can pass for a renamed/corrupt file: make sure the
      // browser can actually draw it before it enters the design (and history).
      await loadImage(dataUrl);
      if (request !== latestRequest.current) return;
      dispatch({ type: "SET_LOGO", dataUrl });
    } catch (err) {
      console.error("Failed to load crest image", err);
      if (request === latestRequest.current) setError("No se pudo leer la imagen.");
    }
  }

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
            latestRequest.current++;
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
