"use client";
import { useEffect, useRef, useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { canResetDesign } from "@/lib/builder/state/design-history";
import { loadDraft, saveDraft, type Draft } from "@/lib/builder/state/design-draft";
import { findStep, type StepId } from "@/lib/builder/steps";

// How long after the last change the draft is written: typing a name does not write on every key.
export const DRAFT_SAVE_DELAY_MS = 300;
// How long the notice stays.
export const DRAFT_NOTICE_MS = 4000;

const RESTORED = "Recuperamos tu diseño";
const NO_IMAGES = "El escudo y los sponsors no entran en el guardado del navegador: si recargás, vas a tener que volver a subirlos.";

type Props = {
  step: StepId;
  visited: ReadonlySet<StepId>;
  /** The draft brought back the step that was open and the steps done. */
  onRestore: (step: StepId, visited: ReadonlySet<StepId>) => void;
  /** While the splash covers the builder the notice waits: it would go by unseen. */
  holdNotice?: boolean;
};

// Autosave: the design, the open step and the steps done are kept in the browser as they change, and
// the builder opens with them. It restores after mount (not in the initial state) so the server and the
// first client render match, and writes nothing before it has restored.
export function DraftKeeper({ step, visited, onRestore, holdNotice = false }: Props) {
  const { state, dispatch, setEditing } = useDesign();
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const warnedNoImages = useRef(false);
  const latest = useRef<Draft | null>(null);

  // Reading the browser's storage is syncing with something outside React, and it has to wait for the
  // mount (the server has no storage): an effect is the place, so its state updates are on purpose.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      dispatch({ type: "LOAD_DESIGN", design: draft.design });
      onRestore(draft.step, new Set(draft.visited));
      // The viewer shows the shirt of that step, as when the step is opened.
      const shows = findStep(draft.step).shows;
      if (shows) setEditing(shows);
      if (canResetDesign(draft.design)) setNotice(RESTORED);
    }
    setReady(true);
    // Once, on opening the builder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    latest.current = { design: state, step, visited: [...visited] };
    const timer = window.setTimeout(() => {
      const result = saveDraft(latest.current!);
      if (result === "saved-without-images" && !warnedNoImages.current) {
        warnedNoImages.current = true;
        setNotice(NO_IMAGES);
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready, state, step, visited]);

  // Leaving or reloading the page within the delay still keeps the last change.
  useEffect(() => {
    const flush = () => {
      if (latest.current) saveDraft(latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  useEffect(() => {
    if (!notice || holdNotice) return;
    const timer = window.setTimeout(() => setNotice(null), notice === NO_IMAGES ? DRAFT_NOTICE_MS * 2 : DRAFT_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, holdNotice]);

  // Only there while it says something: the page has no other message area to keep.
  if (!notice || holdNotice) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-4 md:top-20">
      <p role="status" className="max-w-sm rounded-2xl bg-foreground px-4 py-2 text-center text-sm font-medium text-white shadow-lg">
        {notice}
      </p>
    </div>
  );
}
