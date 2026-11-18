"use client";
import { useState } from "react";
import { SizeGuideDialog } from "@/components/size-guide/SizeGuideDialog";
import { CheckIcon, RulerIcon } from "./icons";
import { useDesign } from "@/lib/builder/state/design-context";
import { STEPS, stepStatus, type StepId, type StepStatus } from "@/lib/builder/steps";

export type NavId = StepId;

type Props = {
  active: StepId;
  /** The steps that were left at least once: they count as done (see stepStatus). */
  visited: ReadonlySet<StepId>;
  onChange: (id: StepId) => void;
};

// What an optional garment's step says under its name.
const OPTIONAL_NOTE: Record<StepStatus, string> = {
  todo: "Opcional",
  current: "Opcional",
  skipped: "No sumado",
  done: "Sumado",
};

// The number of a step, a tick once it is done, a dash when its garment was left out.
function StepBadge({ index, status }: { index: number; status: StepStatus }) {
  return (
    <span
      data-testid="step-badge"
      data-status={status}
      className={[
        "absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white px-0.5 text-[10px] font-bold leading-none",
        status === "done" ? "bg-accent text-foreground" : "",
        status === "current" ? "bg-foreground text-white" : "",
        status === "skipped" ? "bg-black/10 text-muted" : "",
        status === "todo" ? "bg-black/10 text-foreground/70" : "",
      ].join(" ")}
    >
      {status === "done" ? <CheckIcon className="h-3 w-3" /> : status === "skipped" ? "–" : index + 1}
    </span>
  );
}

// The line of steps. One element, two layouts: bottom bar below `md`, left column from `md` up, where a
// line joins the steps and fills in as they are done.
export function SectionNav({ active, visited, onChange }: Props) {
  const { state, setEditing } = useDesign();
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  return (
    <nav
      aria-label="Etapas"
      className="flex justify-around border-t border-line bg-white px-2 py-1 md:w-52 md:flex-col md:justify-start md:gap-1 md:border-0 md:bg-transparent md:p-3"
    >
      {STEPS.map(({ id, label, shortLabel, icon, shows, optional }, index) => {
        const status = stepStatus(id, { current: active, visited, design: state });
        const last = index === STEPS.length - 1;
        return (
          <div key={id} className="relative flex flex-1 md:flex-none">
            {/* The line down to the next step: filled once this one is done. */}
            {!last && (
              <span
                aria-hidden="true"
                className={[
                  "absolute left-[2.15rem] top-[3.1rem] hidden h-[calc(100%-2.1rem)] w-0.5 rounded md:block",
                  status === "done" ? "bg-accent" : "bg-black/10",
                ].join(" ")}
              />
            )}
            <button
              type="button"
              aria-label={label}
              aria-current={status === "current" ? "step" : undefined}
              onClick={() => {
                if (shows) setEditing(shows);
                onChange(id);
              }}
              className={[
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                "md:flex-row md:gap-3 md:rounded-2xl md:px-4 md:py-3 md:text-left md:text-sm",
                status === "current"
                  ? "bg-accent-soft font-semibold text-foreground"
                  : "text-muted hover:text-foreground md:hover:bg-black/5",
              ].join(" ")}
            >
              {/* Every icon sits in the same square box; `object-contain` keeps any aspect ratio inside it. */}
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                <img src={icon} alt="" className="h-full w-full object-contain" />
                <StepBadge index={index} status={status} />
              </span>
              <span className="flex flex-col items-center md:items-start">
                <span className="md:hidden">{shortLabel}</span>
                <span className="hidden md:inline">{label}</span>
                {optional && (
                  <span
                    className={[
                      "text-[10px] font-medium leading-4 md:text-xs",
                      status === "done" ? "text-foreground" : "text-muted",
                    ].join(" ")}
                  >
                    {OPTIONAL_NOTE[status === "current" && state[optional].included ? "done" : status]}
                  </span>
                )}
              </span>
            </button>
          </div>
        );
      })}
      {/* Not a step: it opens the size chart over the builder, whichever step is open. */}
      <button
        type="button"
        aria-label="Ver talles"
        onClick={() => setSizeGuideOpen(true)}
        className={[
          "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-muted transition-colors hover:text-foreground",
          "md:mt-2 md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:border-t md:border-line md:px-4 md:py-3 md:text-left md:text-sm md:hover:bg-black/5",
        ].join(" ")}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <RulerIcon className="h-6 w-6" />
        </span>
        <span>Talles</span>
      </button>
      <SizeGuideDialog open={sizeGuideOpen} withShorts={state.shorts.included} onClose={() => setSizeGuideOpen(false)} />
    </nav>
  );
}
