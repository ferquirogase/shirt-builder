import { STEPS, type StepId } from "../steps";
import { withDesignDefaults } from "./design-defaults";
import type { DesignState } from "./design-state";

// The design being made, kept in the browser (localStorage) as it changes: a reload, or coming back
// another day, opens the builder where the user left it. Not the order: that one lives in the
// session, for the checkout (see lib/checkout/order-storage.ts).
export const DRAFT_KEY = "gepe:draft";

export type Draft = {
  design: DesignState;
  /** The step that was open, and the steps already done, so the line of steps comes back too. */
  step: StepId;
  visited: StepId[];
};

/** "saved-without-images": the crest and the sponsors did not fit, everything else was kept. */
export type SaveResult = "saved" | "saved-without-images" | "failed";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isStep = (value: unknown): value is StepId => STEPS.some((s) => s.id === value);

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.design)) return null;
    return {
      design: withDesignDefaults(parsed.design as Partial<DesignState>),
      step: isStep(parsed.step) ? parsed.step : "player",
      visited: Array.isArray(parsed.visited) ? parsed.visited.filter(isStep) : [],
    };
  } catch {
    return null;
  }
}

// The images are what makes a draft heavy: the browser gives a page a few MB.
function withoutImages(draft: Draft): Draft {
  return { ...draft, design: { ...draft.design, logoDataUrl: null, crestConfig: null, sponsors: {} } };
}

export function saveDraft(draft: Draft): SaveResult {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return "saved";
  } catch {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(withoutImages(draft)));
      return "saved-without-images";
    } catch {
      // An older draft must not come back in place of this one.
      clearDraft();
      return "failed";
    }
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage is unavailable: there is nothing to clear.
  }
}
