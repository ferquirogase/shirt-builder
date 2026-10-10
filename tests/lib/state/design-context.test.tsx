import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderWithDesign } from "../../helpers/render-with-design";
import { DesignProvider, useDesign, useEditedLook } from "@/lib/builder/state/design-context";
import type { ReactNode } from "react";

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

const wrapper = ({ children }: { children: ReactNode }) => <DesignProvider>{children}</DesignProvider>;
const mountBoth = () => renderHook(() => ({ design: useDesign(), look: useEditedLook() }), { wrapper });

describe("which shirt is shown", () => {
  it("shows the player shirt until the keeper is chosen", () => {
    const { result } = mountBoth();
    act(() => result.current.design.setEditing("keeper"));
    expect(result.current.design.editing).toBe("player");

    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.design.setEditing("keeper"));
    expect(result.current.design.editing).toBe("keeper");
    expect(result.current.design.viewed.colors.primary).toBe(result.current.design.state.keeper.look!.colors.primary);
  });

  it("goes back to the player shirt when the keeper is taken out", () => {
    const { result } = mountBoth();
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.design.setEditing("keeper"));
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: false }));
    expect(result.current.design.editing).toBe("player");
    expect(result.current.design.viewed).toBe(result.current.design.state);
  });

  it("does not jump to the keeper when it is added back later", () => {
    const { result } = mountBoth();
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.design.setEditing("keeper"));
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: false }));
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(result.current.design.editing).toBe("player");
  });

  it("edits the shirt being shown", () => {
    const { result } = mountBoth();
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.look.dispatchLook({ type: "SET_COLOR", slot: "primary", value: "#111111" }));
    expect(result.current.design.state.colors.primary).toBe("#111111");

    act(() => result.current.design.setEditing("keeper"));
    act(() => result.current.look.dispatchLook({ type: "SET_COLOR", slot: "primary", value: "#222222" }));
    expect(result.current.design.state.colors.primary).toBe("#111111");
    expect(result.current.design.state.keeper.look!.colors.primary).toBe("#222222");
    expect(result.current.look.view.colors.primary).toBe("#222222");
  });
});
