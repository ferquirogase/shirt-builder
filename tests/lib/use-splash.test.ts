import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  SPLASH_FADE_MS,
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
  SPLASH_SEEN_KEY,
} from "@/lib/builder/splash";
import { useSplash } from "@/lib/builder/use-splash";

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("useSplash", () => {
  it("shows the splash, and keeps it until the minimum time even if the model is ready", () => {
    const { result } = renderHook(() => useSplash(true));
    expect(result.current).toBe("showing");
    advance(SPLASH_MIN_MS - 1);
    expect(result.current).toBe("showing");
  });

  it("leaves once the minimum time passed and the model is ready, then is gone after the fade", () => {
    const { result } = renderHook(() => useSplash(true));
    advance(SPLASH_MIN_MS);
    expect(result.current).toBe("leaving");
    advance(SPLASH_FADE_MS);
    expect(result.current).toBe("gone");
  });

  it("waits for the model after the minimum time", () => {
    const { result, rerender } = renderHook(({ ready }) => useSplash(ready), { initialProps: { ready: false } });
    advance(SPLASH_MIN_MS + 1000);
    expect(result.current).toBe("showing");
    rerender({ ready: true });
    expect(result.current).toBe("leaving");
  });

  it("leaves anyway at the maximum time if the model never loads", () => {
    const { result } = renderHook(() => useSplash(false));
    advance(SPLASH_MAX_MS - 1);
    expect(result.current).toBe("showing");
    advance(1);
    expect(result.current).toBe("leaving");
  });

  it("does not count as seen if the page is left halfway", () => {
    const first = renderHook(() => useSplash(true));
    advance(SPLASH_MIN_MS);
    first.unmount();
    expect(window.sessionStorage.getItem(SPLASH_SEEN_KEY)).toBeNull();
  });

  it("is gone from the start when it was already seen in this session", () => {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    const { result } = renderHook(() => useSplash(false));
    expect(result.current).toBe("gone");
  });

  it("remembers that it was seen, so coming back to the builder skips it", () => {
    const first = renderHook(() => useSplash(true));
    advance(SPLASH_MIN_MS);
    advance(SPLASH_FADE_MS);
    expect(first.result.current).toBe("gone");
    first.unmount();

    const second = renderHook(() => useSplash(true));
    expect(second.result.current).toBe("gone");
  });

  it("still shows when sessionStorage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useSplash(true));
    expect(result.current).toBe("showing");
    spy.mockRestore();
  });
});
