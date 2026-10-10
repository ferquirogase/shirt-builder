"use client";
import { useEffect, useRef, useState } from "react";
import { ShareIcon, ShirtIcon } from "@/components/builder/icons";
import { useDesign } from "@/lib/builder/state/design-context";
import type { ShareResult } from "@/lib/share/share-image";
import type { ShareStoryState } from "@/lib/share/use-share-story";
import { Confetti } from "./Confetti";

type Props = {
  state: ShareStoryState;
  onShare: (projectName: string) => Promise<ShareResult | null>;
  onAnother: () => void;
  onRetry: () => void;
  onClose: () => void;
};

const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-foreground transition-colors enabled:hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60";
const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

export function ShareStoryDialog({ state, onShare, onAnother, onRetry, onClose }: Props) {
  const { state: design, editing } = useDesign();
  const dialog = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const open = state.status !== "closed";

  // Take the focus when the dialog opens and give it back when it closes.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, [open]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setNote(null);
    try {
      const result = await onShare(design.projectName);
      if (result === "downloaded") setNote("Se descargó la imagen. Subila a tu historia desde la galería.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      {state.status === "ready" && <Confetti />}
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Compartir tu camiseta"
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-sm flex-col items-center gap-4 outline-none"
      >
        <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} self-end`}>
          Cerrar
        </button>

        {state.status === "preparing" && (
          <div role="status" className="flex flex-col items-center gap-4 py-16 text-white">
            <ShirtIcon className="h-16 w-16 animate-pulse" />
            <p className="text-lg font-semibold">Armando tu camiseta…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center text-white">
            <p role="alert" className="text-lg font-semibold">
              No pudimos armar la imagen.
            </p>
            <button type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
              Reintentar
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a blob made in the browser, nothing to optimize */}
            <img
              src={state.imageUrl}
              alt="Tu camiseta, lista para compartir"
              className="story-in max-h-[68dvh] w-auto rounded-2xl shadow-2xl"
            />
            {/* The picture is of the shirt the viewer was showing: with a keeper in the order, say which. */}
            {design.keeper.included && (
              <p className="text-sm font-semibold text-white/90">
                {editing === "keeper" ? "Camiseta de arquero" : "Camiseta de jugador"}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={onAnother} className={SECONDARY_BUTTON}>
                Otra frase
              </button>
              <button type="button" onClick={handleShare} disabled={sharing} className={PRIMARY_BUTTON}>
                <ShareIcon className="h-5 w-5" />
                Compartir
              </button>
            </div>
            {note && (
              <p role="status" className="text-center text-sm text-white/90">
                {note}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
