"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { guidesFor, type SizeGuide } from "@/lib/checkout/size-guides";

const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

// GEPE's size charts in a window over the order. It opens on the shirt's chart (or the one asked for);
// when there are shorts there is a tab for theirs too. The charts are pictures, so a link opens one at full size to
// zoom in on a phone. It is drawn in the body of the page: inside a panel, a blur or a transform on an
// ancestor would make "fixed" mean the panel, and cut it down to the panel's size.
type Props = {
  open: boolean;
  withShorts: boolean;
  /** The chart it opens on: the shirt's unless said otherwise. */
  initial?: SizeGuide["id"];
  onClose: () => void;
};

export function SizeGuideDialog({ open, withShorts, initial = "shirt", onClose }: Props) {
  // Mounted only while open, so it starts on the same chart every time.
  return open ? createPortal(<Content withShorts={withShorts} initial={initial} onClose={onClose} />, document.body) : null;
}

function Content({ withShorts, initial, onClose }: Omit<Props, "open"> & { initial: SizeGuide["id"] }) {
  const guides = guidesFor({ withShorts });
  const [selected, setSelected] = useState(guides.some((g) => g.id === initial) ? initial : guides[0].id);
  const guide = guides.find((g) => g.id === selected) ?? guides[0];
  const dialog = useRef<HTMLDivElement>(null);

  // Take the focus when it opens and give it back to what opened it.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);

  // Escape closes; Tab stays inside.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="size-guide-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Guía de talles"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-full w-full max-w-md flex-col gap-3 outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          {guides.length > 1 ? (
            <div role="tablist" aria-label="Prenda" className="flex rounded-full bg-white/15 p-1">
              {guides.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={g.id === guide.id}
                  onClick={() => setSelected(g.id)}
                  className={`h-11 rounded-full px-5 text-sm font-semibold transition ${
                    g.id === guide.id ? "bg-white text-foreground" : "text-white hover:bg-white/10"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 text-base font-semibold text-white">Guía de talles</p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/70 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <div role="tabpanel" className="thin-scroll min-h-0 overflow-y-auto rounded-2xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- GEPE's own chart, used as it comes */}
          <img src={guide.image} alt={guide.alt} width={900} height={1600} className="block h-auto w-full" />
        </div>

        <a
          href={guide.image}
          target="_blank"
          rel="noopener noreferrer"
          className="self-center text-sm font-semibold text-white underline underline-offset-4"
        >
          Abrir en tamaño completo
        </a>
      </div>
    </div>
  );
}
