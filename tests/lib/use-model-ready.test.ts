import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const progress = { active: false, total: 0 };
vi.mock("@react-three/drei", () => ({ useProgress: () => progress }));

import { useModelReady } from "@/lib/builder/use-model-ready";

describe("useModelReady", () => {
  it("is not ready before anything started loading", () => {
    Object.assign(progress, { active: false, total: 0 });
    expect(renderHook(() => useModelReady()).result.current).toBe(false);
  });

  it("is not ready while something is loading", () => {
    Object.assign(progress, { active: true, total: 3 });
    expect(renderHook(() => useModelReady()).result.current).toBe(false);
  });

  it("is ready once what started loading finished", () => {
    Object.assign(progress, { active: false, total: 3 });
    expect(renderHook(() => useModelReady()).result.current).toBe(true);
  });
});
