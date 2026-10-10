"use client";
import { useId, type ReactNode } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { CREST_SYMBOLS } from "@/lib/builder/catalog/crest-symbols";
import {
  CREST_DIVISIONS,
  INITIAL_CREST,
  MAX_INITIALS,
  cleanInitials,
  type CrestConfig,
} from "@/lib/builder/crest/crest-config";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";

// Same selected / hover / focus language as the pattern grids, so the panel feels like one family.
const CHOICE =
  "flex items-center justify-center rounded-xl border-2 bg-white/70 text-xs font-medium transition active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const border = (checked: boolean) => (checked ? "border-accent shadow-sm" : "border-transparent hover:border-line");
const COLOR_INPUT = "h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent";

function Group({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="mt-5">
      <p id={id} className="mb-2 text-sm font-semibold">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className={className}>
        {children}
      </div>
    </div>
  );
}

function ColorRow({ label, short, value, onChange }: { label: string; short: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-white/70 py-1.5 pl-3 pr-2 text-sm font-medium">
      {short}
      <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={COLOR_INPUT} />
    </label>
  );
}

export function CrestCreator() {
  const { state, dispatch } = useDesign();
  // Until the first edit the creator shows the starting crest; the shirt keeps what it had.
  const config = state.crestConfig ?? INITIAL_CREST;
  const update = (patch: Partial<CrestConfig>) =>
    dispatch({ type: "SET_CREST_CONFIG", config: { ...config, ...patch } });
  const symbol = config.symbol;
  const symbolChoice = symbol === null ? "none" : symbol.kind === "icon" ? symbol.id : "initials";

  return (
    <div>
      {/* The result and its two colors side by side: the panel scrolls inside a short sheet on a phone. */}
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
        <img src={crestDataUrl(config)} alt="Vista previa del escudo" className="h-24 w-24 shrink-0 rounded-2xl bg-white/70 p-2" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ColorRow
            label="Color principal del escudo"
            short="Principal"
            value={config.colors.primary}
            onChange={(primary) => update({ colors: { ...config.colors, primary } })}
          />
          <ColorRow
            label="Color secundario del escudo"
            short="Secundario"
            value={config.colors.secondary}
            onChange={(secondary) => update({ colors: { ...config.colors, secondary } })}
          />
        </div>
      </div>

      <Group label="Forma" className="grid grid-cols-5 gap-2">
        {CREST_SHAPES.map((shape, index) => {
          const checked = shape.id === config.shapeId;
          return (
            <button
              key={shape.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`Forma ${index + 1}`}
              onClick={() => update({ shapeId: shape.id })}
              className={`${CHOICE} aspect-square p-2 ${border(checked)}`}
            >
              <svg
                aria-hidden="true"
                viewBox={`${shape.box.x} ${shape.box.y} ${shape.box.width} ${shape.box.height}`}
                className="h-full w-full text-foreground"
              >
                <path d={shape.d} fill="currentColor" />
              </svg>
            </button>
          );
        })}
      </Group>

      <Group label="Fondo" className="grid grid-cols-4 gap-2">
        {CREST_DIVISIONS.map((division) => {
          const checked = division.id === config.divisionId;
          return (
            <button
              key={division.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={division.label}
              onClick={() => update({ divisionId: division.id })}
              className={`${CHOICE} flex-col gap-1 p-1.5 ${border(checked)}`}
            >
              {/* Each background drawn on the shape and colors chosen so far. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
              <img src={crestDataUrl({ ...config, divisionId: division.id, symbol: null })} alt="" className="h-11 w-11" />
              <span aria-hidden="true">{division.label}</span>
            </button>
          );
        })}
      </Group>

      <Group label="Símbolo" className="grid grid-cols-5 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={symbolChoice === "none"}
          onClick={() => update({ symbol: null })}
          className={`${CHOICE} h-11 leading-tight ${border(symbolChoice === "none")}`}
        >
          Sin símbolo
        </button>
        {CREST_SYMBOLS.map((def) => {
          const checked = symbolChoice === def.id;
          return (
            <button
              key={def.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={def.label}
              onClick={() => update({ symbol: { kind: "icon", id: def.id } })}
              className={`${CHOICE} h-11 p-2.5 ${border(checked)}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full text-foreground">
                <path d={def.d} fill="currentColor" fillRule="evenodd" />
              </svg>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={symbolChoice === "initials"}
          onClick={() => update({ symbol: { kind: "initials", text: symbol?.kind === "initials" ? symbol.text : "" } })}
          className={`${CHOICE} h-11 ${border(symbolChoice === "initials")}`}
        >
          Iniciales
        </button>
      </Group>

      {symbol?.kind === "initials" && (
        <input
          type="text"
          aria-label="Iniciales"
          placeholder="Hasta 3 letras"
          maxLength={MAX_INITIALS}
          autoComplete="off"
          value={symbol.text}
          onChange={(e) => update({ symbol: { kind: "initials", text: cleanInitials(e.target.value) } })}
          className="mt-3 w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-base uppercase outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        />
      )}
    </div>
  );
}
