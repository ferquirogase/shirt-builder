import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderWithDesign } from "../../helpers/render-with-design";
import { useDesign } from "@/lib/builder/state/design-context";

describe("DesignProvider", () => {
  it("exposes state, dispatch and undo/redo availability", () => {
    const { api } = renderWithDesign(<div />);
    expect(api.current!.canUndo).toBe(false);
    expect(api.current!.canRedo).toBe(false);

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(api.current!.state.bodyPatternId).toBe("plain-body");
    expect(api.current!.canUndo).toBe(true);

    act(() => api.current!.dispatch({ type: "UNDO" }));
    expect(api.current!.state.bodyPatternId).not.toBe("plain-body");
    expect(api.current!.canRedo).toBe(true);

    act(() => api.current!.dispatch({ type: "REDO" }));
    expect(api.current!.state.bodyPatternId).toBe("plain-body");
  });

  it("loads a whole design without making it undoable", () => {
    const { api } = renderWithDesign(<div />);
    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    act(() =>
      api.current!.dispatch({
        type: "LOAD_DESIGN",
        design: { ...api.current!.state, projectName: "Cargado", bodyPatternId: "stripes-v1" },
      })
    );
    expect(api.current!.state.projectName).toBe("Cargado");
    expect(api.current!.state.bodyPatternId).toBe("stripes-v1");
    expect(api.current!.canUndo).toBe(false);
  });

  describe("grouping uses real timestamps from the provider", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000_000);
    });
    afterEach(() => vi.useRealTimers());

    it("collapses quick edits of one field into a single undo step", () => {
      const { api } = renderWithDesign(<div />);
      act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "P" }));
      vi.setSystemTime(1_000_100);
      act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "PE" }));

      act(() => api.current!.dispatch({ type: "UNDO" }));
      expect(api.current!.state.playerName).toBe("");
      expect(api.current!.canUndo).toBe(false);
    });

    it("keeps edits made after a pause as separate undo steps", () => {
      const { api } = renderWithDesign(<div />);
      act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "P" }));
      vi.setSystemTime(1_005_000);
      act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "PE" }));

      act(() => api.current!.dispatch({ type: "UNDO" }));
      expect(api.current!.state.playerName).toBe("P");
    });
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useDesign())).toThrow(/DesignProvider/);
  });
});
