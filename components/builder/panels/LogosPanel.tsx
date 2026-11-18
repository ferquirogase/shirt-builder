"use client";
import { useState } from "react";
import { CrestPanel } from "./CrestPanel";
import { SponsorPanel } from "./SponsorPanel";

type Tab = "escudo" | "sponsors";
const TABS: { id: Tab; label: string }[] = [
  { id: "escudo", label: "Escudo" },
  { id: "sponsors", label: "Sponsors" },
];

// The step for what goes on every garment of the kit: the crest and the sponsors, a tab each.
export function LogosPanel() {
  const [tab, setTab] = useState<Tab>("escudo");
  return (
    <>
      <div className="px-5 pt-4">
        <div role="tablist" aria-label="Qué poner" className="grid grid-cols-2 rounded-2xl bg-black/5 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-9 rounded-xl px-1 text-[13px] font-medium transition ${
                tab === id ? "bg-white font-semibold shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "escudo" ? <CrestPanel /> : <SponsorPanel />}
    </>
  );
}
