"use client";
import type { ReactNode } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { STEPS, findStep, nextStep, stepIndex, stepStatus, type StepId } from "@/lib/builder/steps";
import { SizeGuideButton } from "@/components/size-guide/SizeGuideButton";
import { ArrowRightIcon } from "./icons";
import { useGoToStep } from "./use-go-to-step";

type Props = {
  step: StepId;
  visited: ReadonlySet<StepId>;
  onGo: (id: StepId) => void;
  children: ReactNode;
};

// Around every step's panel: where the user is (step N of 5, with the line of steps filling in) and,
// at the bottom and always in sight, the way on to the next step. An optional garment not added yet
// has no Siguiente: its own card asks whether to add it or go on without it. A garment's step also has
// the size chart by its title, open on that garment's chart.
export function StepFrame({ step, visited, onGo, children }: Props) {
  const { state } = useDesign();
  const goTo = useGoToStep(onGo);
  const { label, optional, sizeGuide } = findStep(step);
  const next = nextStep(step);
  const deciding = optional !== undefined && !state[optional].included;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 px-5 pt-3 md:pt-5">
        <p className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Paso {stepIndex(step) + 1} de {STEPS.length}
          </span>
          <span className="truncate text-base font-bold leading-tight">{label}</span>
        </p>
        {sizeGuide && (
          <SizeGuideButton
            initial={sizeGuide}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-muted underline-offset-2 transition-colors hover:bg-black/5 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 active:bg-black/10"
          />
        )}
        {/* On a phone the panel is short: the way on sits up here, small, instead of over the panel's content. */}
        {next && !deciding && (
          <button
            type="button"
            aria-label={`Siguiente: ${findStep(next).label}`}
            onClick={() => goTo(next)}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-foreground pl-4 pr-3 text-[13px] font-semibold text-white md:hidden"
          >
            {findStep(next).shortLabel}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        )}
        <ol aria-hidden="true" className="ml-auto hidden shrink-0 gap-1 md:flex">
          {STEPS.map(({ id }) => {
            const status = stepStatus(id, { current: step, visited, design: state });
            return (
              <li
                key={id}
                data-status={status}
                className={[
                  "h-1.5 w-5 rounded-full",
                  status === "done" ? "bg-accent" : "",
                  status === "current" ? "bg-foreground" : "",
                  status === "skipped" ? "bg-black/20" : "",
                  status === "todo" ? "bg-black/10" : "",
                ].join(" ")}
              />
            );
          })}
        </ol>
      </div>

      <div className="flex-1">{children}</div>

      {next && !deciding && (
        <div className="sticky bottom-0 mt-auto hidden bg-gradient-to-t from-white via-white/95 to-white/0 px-5 pb-4 pt-3 md:block md:from-[#fafaf8] md:via-[#fafaf8]/95">
          <button
            type="button"
            onClick={() => goTo(next)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Siguiente: {findStep(next).label}
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
