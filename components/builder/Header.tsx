"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import type { DesignState } from "@/lib/builder/state/design-state";
import { ArrowRightIcon, PencilIcon, ShareIcon } from "./icons";

type HeaderProps = {
  onReview: (design: DesignState) => void;
  onShare: () => void;
  reviewing?: boolean;
  sharing?: boolean;
};

export function Header({ onReview, onShare, reviewing = false, sharing = false }: HeaderProps) {
  const { state, dispatch } = useDesign();
  const [draft, setDraft] = useState(state.projectName);
  // The name can change from outside the field (a design loaded from the
  // checkout): when it does, the draft follows it.
  const [seenName, setSeenName] = useState(state.projectName);
  if (seenName !== state.projectName) {
    setSeenName(state.projectName);
    setDraft(state.projectName);
  }

  function commit() {
    const next = draft.trim();
    if (!next) {
      setDraft(state.projectName);
      return;
    }
    setDraft(next);
    if (next !== state.projectName) {
      dispatch({ type: "SET_PROJECT_NAME", value: next });
    }
  }

  return (
    <header className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-4">
      <span className="text-2xl font-black tracking-tight md:text-3xl">
        GEPE<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
      </span>
      <div className="hidden h-8 w-px bg-line md:block" />
      <label className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <span className="sr-only">Nombre del diseño</span>
        <input
          type="text"
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="min-w-0 bg-transparent text-base font-semibold rounded outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 md:w-56"
        />
        <PencilIcon className="h-4 w-4 shrink-0 text-muted" />
      </label>

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
          onClick={() => onReview(state)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold transition-colors enabled:hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          <span className="sr-only md:not-sr-only">{reviewing ? "Preparando…" : "Hacer pedido"}</span>
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
