"use client";
import { useDesign } from "@/lib/builder/design-context";
import { SPONSOR_MAX_SCALE, SPONSOR_MIN_SCALE, SPONSOR_SLOTS, type SponsorSlot } from "@/lib/builder/sponsor-slots";
import { useImageUpload } from "@/lib/builder/use-image-upload";
import { UploadIcon } from "../icons";
import { PanelShell } from "./PanelShell";

function SponsorCard({ slot }: { slot: SponsorSlot }) {
  const { state, dispatch } = useDesign();
  const entry = state.sponsors[slot.id];
  const { error, handleFile, cancelPending } = useImageUpload((dataUrl) =>
    dispatch({ type: "SET_SPONSOR", slot: slot.id, dataUrl })
  );

  return (
    <section aria-label={slot.label} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3">
      <h3 className="text-sm font-semibold">{slot.label}</h3>

      <div className="flex items-center gap-3">
        {entry && (
          <span
            role="img"
            aria-label={`Sponsor de ${slot.label}`}
            className="h-12 w-12 shrink-0 rounded-lg border border-line bg-black/5 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${entry.dataUrl}")` }}
          />
        )}
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-3 py-2 text-sm font-medium hover:border-accent focus-within:ring-2 focus-within:ring-foreground/60">
          <UploadIcon className="h-5 w-5 text-muted" />
          <span>{entry ? "Reemplazar" : "Subir imagen"}</span>
          <input
            type="file"
            aria-label={`Subir sponsor: ${slot.label}`}
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {entry && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Tamaño</span>
            <input
              type="range"
              aria-label={`Tamaño del sponsor: ${slot.label}`}
              min={SPONSOR_MIN_SCALE}
              max={SPONSOR_MAX_SCALE}
              step={0.05}
              value={entry.scale}
              onChange={(e) => dispatch({ type: "SET_SPONSOR_SCALE", slot: slot.id, value: Number(e.target.value) })}
            />
          </div>
          <button
            type="button"
            aria-label={`Quitar sponsor: ${slot.label}`}
            onClick={() => {
              cancelPending();
              dispatch({ type: "REMOVE_SPONSOR", slot: slot.id });
            }}
            className="self-start rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-black/5"
          >
            Quitar
          </button>
        </>
      )}
    </section>
  );
}

export function SponsorPanel() {
  return (
    <PanelShell title="Sponsor" hint="Una imagen por ubicación. PNG, JPG o SVG, máximo 2 MB.">
      <div className="flex flex-col gap-3">
        {SPONSOR_SLOTS.map((slot) => (
          <SponsorCard key={slot.id} slot={slot} />
        ))}
      </div>
    </PanelShell>
  );
}
