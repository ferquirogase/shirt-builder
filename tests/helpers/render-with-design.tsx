import { useEffect, type ReactElement } from "react";
import { render } from "@testing-library/react";
import { DesignProvider, useDesign, type DesignContextValue } from "@/lib/builder/state/design-context";

// Renders `ui` inside a DesignProvider and exposes the live context value as
// `api.current` so tests can dispatch actions and read state.
export function renderWithDesign(ui: ReactElement) {
  const api: { current: DesignContextValue | null } = { current: null };
  function Capture() {
    const value = useDesign();
    useEffect(() => {
      api.current = value;
    });
    return null;
  }
  const utils = render(
    <DesignProvider>
      {ui}
      <Capture />
    </DesignProvider>
  );
  return { ...utils, api };
}
