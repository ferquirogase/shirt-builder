"use client";
import { useEffect, useRef } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import {
  SPONSOR_MAX_SCALE,
  SPONSOR_MIN_SCALE,
  SPONSOR_SLOTS,
  sponsorNumber,
  type SponsorSlot,
} from "@/lib/builder/catalog/sponsor-slots";
import { useImageUpload } from "@/lib/builder/io/use-image-upload";
import { UploadIcon } from "../icons";
import { PanelShell } from "./PanelShell";

function SponsorCard({ slot }: { slot: SponsorSlot }) {
  const { state, dispatch, selectedSponsor, registerSponsorUploader } = useDesign();
  const entry = state.sponsors[slot.id];
  const selected = selectedSponsor === slot.id;
  const input = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLElement>(null);

  // A marker on the shirt opens this card's file chooser through here.
  useEffect(
    () => registerSponsorUploader(slot.id, () => input.current?.click()),
    [slot.id, registerSponsorUploader]
  );

  // Picked on the shirt: bring its card into view.
  useEffect(() => {
    if (selected) card.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  const { error, handleFile, cancelPending } = useImageUpload((dataUrl) =>
    dispatch({ type: "SET_SPONSOR", slot: slot.id, dataUrl })
  );

  return (
    <section
      ref={card}
      aria-label={slot.label}
      aria-current={selected ? "true" : undefined}
      className={`flex flex-col gap-3 rounded-2xl bg-white/70 p-3 ${selected ? "ring-2 ring-foreground" : ""}`}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white"
        >
          {sponsorNumber(slot.id)}
        </span>
        {slot.label}
      </h3>

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
            ref={input}
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
  const { setSponsorMarkers, selectSponsor } = useDesign();
  // While this panel is open the shirt shows a marker on each placement.
  useEffect(() => {
    setSponsorMarkers(true);
    return () => {
      setSponsorMarkers(false);
      selectSponsor(null);
    };
  }, [setSponsorMarkers, selectSponsor]);

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
