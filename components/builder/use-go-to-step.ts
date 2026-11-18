"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import { findStep, type StepId } from "@/lib/builder/steps";

// Opening a step from anywhere (the line, Siguiente, the summary): the viewer shows the step's shirt,
// as when it is picked on the line, and the page is told.
export function useGoToStep(onGo: (id: StepId) => void): (id: StepId) => void {
  const { setEditing } = useDesign();
  return (id) => {
    const shows = findStep(id).shows;
    if (shows) setEditing(shows);
    onGo(id);
  };
}
