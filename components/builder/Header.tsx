"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { ArrowRightIcon, PencilIcon, ShareIcon } from "./icons";

export function Header() {
  const { state, dispatch } = useDesign();
  const [draft, setDraft] = useState(state.projectName);

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
    <header className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
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
          className="min-w-0 bg-transparent text-base font-semibold outline-none focus-visible:underline md:w-56"
        />
        <PencilIcon className="h-4 w-4 shrink-0 text-muted" />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled
          title="Próximamente"
          aria-label="Compartir"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/80 bg-white/70 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          <ShareIcon className="h-5 w-5" />
          <span className="hidden md:inline">Compartir</span>
        </button>
        <button
          type="button"
          disabled
          title="Próximamente"
          className="hidden h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
        >
          Revisar diseño
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
