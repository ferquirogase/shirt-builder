"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import type { DesignState, LookTarget } from "@/lib/builder/state/design-state";
import { findPattern } from "@/lib/builder/catalog/patterns";
import { findShortsPattern } from "@/lib/builder/catalog/shorts-patterns";
import { availableSponsorSlots } from "@/lib/builder/catalog/sponsor-slots";
import { formatMoney, pricePerPlayer } from "@/lib/checkout/pricing";
import type { StepId } from "@/lib/builder/steps";
import { SizeGuideButton } from "@/components/size-guide/SizeGuideButton";
import { ArrowRightIcon } from "../icons";
import { useGoToStep } from "../use-go-to-step";

type Props = {
  onGo: (id: StepId) => void;
  onReview: (design: DesignState, showKit: (target: LookTarget) => void) => void;
  busy?: boolean;
};

type Row = { name: string; detail: string; step: StepId; missing: boolean; canAdd?: boolean };

function rowsOf(state: DesignState): Row[] {
  const sponsors = availableSponsorSlots(state).filter((slot) => state.sponsors[slot.id]).length;
  return [
    { name: "Jugador", detail: findPattern(state.bodyPatternId)?.label ?? "Lisa", step: "player", missing: false },
    state.shorts.included
      ? { name: "Short", detail: findShortsPattern(state.shorts.patternId)?.label ?? "Liso", step: "shorts", missing: false }
      : { name: "Short", detail: "No sumado", step: "shorts", missing: true, canAdd: true },
    state.keeper.included
      ? { name: "Arquero", detail: findPattern(state.keeper.look?.bodyPatternId ?? "")?.label ?? "Sumado", step: "keeper", missing: false }
      : { name: "Arquero", detail: "No sumado", step: "keeper", missing: true, canAdd: true },
    { name: "Escudo", detail: state.logoDataUrl ? "Cargado" : "Sin escudo", step: "logos", missing: !state.logoDataUrl },
    {
      name: "Sponsors",
      detail: sponsors === 0 ? "Sin sponsors" : sponsors === 1 ? "1 sponsor" : `${sponsors} sponsors`,
      step: "logos",
      missing: sponsors === 0,
    },
  ];
}

// The last step: what the kit has, a way back to each step, and the order. The names, sizes and
// quantities are asked for on the checkout, so they are only announced here.
export function OrderPanel({ onGo, onReview, busy = false }: Props) {
  const { state, setEditing } = useDesign();
  const goTo = useGoToStep(onGo);

  return (
    <section aria-label="Pedido" className="flex flex-col gap-4 p-5">
      <h2 className="sr-only">Pedido</h2>
      <ul aria-label="Tu equipo" className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-white">
        {rowsOf(state).map((row) => (
          <li key={row.name} className="flex items-center gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">{row.name}</span>
              <span className={`truncate text-sm ${row.missing ? "text-muted" : "text-foreground/80"}`}>{row.detail}</span>
            </span>
            <button
              type="button"
              aria-label={`${row.canAdd ? "Sumar" : "Editar"} ${row.name}`}
              onClick={() => goTo(row.step)}
              className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold underline-offset-2 hover:bg-black/5 hover:underline"
            >
              {row.canAdd ? "Sumar" : "Editar"}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">
        <span className="font-semibold text-foreground">{formatMoney(pricePerPlayer(state.shorts.included))}</span> por jugador
        {state.shorts.included ? " (camiseta y short)" : ""}. En el pedido cargás nombres, números y talles.
      </p>

      {/* The sizes are chosen on the checkout; here is where they start to be thought about. */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/70 px-4 py-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">¿Qué talle pido?</span>
          <span className="text-sm text-muted">Camiseta y short.</span>
        </span>
        <SizeGuideButton className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 active:bg-black/10" />
      </div>

      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => onReview(state, setEditing)}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold transition-colors enabled:hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        Hacer pedido
        <ArrowRightIcon className="h-5 w-5" />
      </button>
    </section>
  );
}
