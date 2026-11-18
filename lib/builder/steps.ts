import type { DesignState, LookTarget } from "./state/design-state";

// The builder goes in steps, as the owners asked: the shirt first, then whether to add the shorts and
// the keeper's shirt, then what goes on all of them (crest and sponsors: sponsors 10-12 are on the
// shorts, so they come after the shorts are decided), and the order last. The steps guide, they do not
// lock: any of them can be opened at any time.
export type StepId = "player" | "shorts" | "keeper" | "logos" | "order";

export type Step = {
  id: StepId;
  label: string;
  /** For the bottom bar on a phone, where the full label does not fit. */
  shortLabel: string;
  icon: string;
  /** The shirt the viewer shows when this step is opened; none leaves it as it was. */
  shows?: LookTarget;
  /** A garment that is offered, not required: its step asks whether to add it. */
  optional?: "shorts" | "keeper";
  /** The size chart offered by the step's title: only the garments' steps, where sizes are thought about. */
  sizeGuide?: "shirt" | "shorts";
};

export const STEPS: readonly Step[] = [
  { id: "player", label: "Jugador", shortLabel: "Jugador", icon: "/icons/sections/kit-shirt-v2.webp", shows: "player", sizeGuide: "shirt" },
  { id: "shorts", label: "Short", shortLabel: "Short", icon: "/icons/sections/kit-kit.webp", shows: "player", optional: "shorts", sizeGuide: "shorts" },
  { id: "keeper", label: "Arquero", shortLabel: "Arquero", icon: "/icons/sections/kit-gloves.webp", shows: "keeper", optional: "keeper", sizeGuide: "shirt" },
  { id: "logos", label: "Escudo y sponsors", shortLabel: "Logos", icon: "/icons/sections/escudo.webp" },
  { id: "order", label: "Pedido", shortLabel: "Pedido", icon: "/icons/sections/pedido.svg", shows: "player" },
];

export function findStep(id: StepId): Step {
  return STEPS.find((s) => s.id === id)!;
}

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

export function nextStep(id: StepId): StepId | null {
  return STEPS[stepIndex(id) + 1]?.id ?? null;
}

export type StepStatus = "current" | "done" | "skipped" | "todo";

/**
 * How a step shows on the line: the one being edited, one already done, an optional garment passed
 * without adding it, or one not reached yet. A step counts as done once it was left (`visited`); an
 * optional garment is done as soon as it is added.
 */
export function stepStatus(
  id: StepId,
  { current, visited, design }: { current: StepId; visited: ReadonlySet<StepId>; design: DesignState }
): StepStatus {
  if (id === current) return "current";
  const optional = findStep(id).optional;
  if (optional && design[optional].included) return "done";
  if (!visited.has(id)) return "todo";
  return optional ? "skipped" : "done";
}
