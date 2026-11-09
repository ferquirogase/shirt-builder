"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import type { DesignState, LookTarget } from "@/lib/builder/state/design-state";
import { ArrowRightIcon, ShareIcon } from "./icons";

type HeaderProps = {
  onReview: (design: DesignState, showKit: (target: LookTarget) => void) => void;
  onShare: () => void;
  reviewing?: boolean;
  sharing?: boolean;
};

export function Header({ onReview, onShare, reviewing = false, sharing = false }: HeaderProps) {
  const { state, setEditing } = useDesign();
  return (
    <header className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-4">
      <span className="text-2xl font-black tracking-tight md:text-3xl">
        GEPE<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={reviewing || sharing}
          aria-busy={sharing}
          aria-label="Compartir"
          onClick={onShare}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/80 bg-white/70 px-3 text-sm font-semibold transition-colors enabled:hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          <ShareIcon className="h-5 w-5" />
          <span className="hidden md:inline">Compartir</span>
        </button>
        <button
          type="button"
          disabled={reviewing || sharing}
          aria-busy={reviewing}
          aria-label={reviewing ? "Preparando…" : "Hacer pedido"}
          onClick={() => onReview(state, setEditing)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold transition-colors enabled:hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          {/* A short word on a phone, where an arrow alone is easy to miss; the whole label on wider screens. */}
          <span aria-hidden="true" className="md:hidden">
            Pedido
          </span>
          <span aria-hidden="true" className="hidden md:inline">
            {reviewing ? "Preparando…" : "Hacer pedido"}
          </span>
          {reviewing ? (
            <span
              data-testid="order-spinner"
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground"
            />
          ) : (
            <ArrowRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </header>
  );
}
