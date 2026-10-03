import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { useDesign } from "@/lib/builder/design-context";

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

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useDesign())).toThrow(/DesignProvider/);
  });
});
