import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const renderStory = vi.fn();
vi.mock("@/lib/share/compose-story", () => ({
  renderStory: (...args: unknown[]) => renderStory(...args),
}));

const shareImage = vi.fn();
vi.mock("@/lib/share/share-image", async () => {
  const actual = await vi.importActual<typeof import("@/lib/share/share-image")>("@/lib/share/share-image");
  return { ...actual, shareImage: (...args: unknown[]) => shareImage(...args) };
});

import { STORY_PHRASES } from "@/lib/share/phrases";
import type { ShirtViews } from "@/lib/share/compose-story";
import { SHARE_URL } from "@/lib/share/story-layout";
import { useShareStory } from "@/lib/share/use-share-story";

const views = { front: {}, back: {} } as unknown as ShirtViews;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

let urlCount = 0;
beforeEach(() => {
  urlCount = 0;
  renderStory.mockReset();
  shareImage.mockReset();
  renderStory.mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  URL.createObjectURL = vi.fn(() => `blob:story-${(urlCount += 1)}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe("useShareStory", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useShareStory(async () => views));
    expect(result.current.state).toEqual({ status: "closed" });
  });

  it("captures the shirts, composes the story and becomes ready with a phrase", async () => {
    const capture = vi.fn(async () => views);
    const { result } = renderHook(() => useShareStory(capture));

    await act(async () => {
      await result.current.open();
    });

    expect(capture).toHaveBeenCalledTimes(1);
    const state = result.current.state;
    expect(state.status).toBe("ready");
    if (state.status !== "ready") throw new Error("unreachable");
    expect(state.imageUrl).toBe("blob:story-1");
    expect(STORY_PHRASES).toContain(state.phrase);
    expect(renderStory).toHaveBeenCalledWith(views, state.phrase);
  });

  it("shows 'preparing' while the camera is still turning", async () => {
    const pending = deferred<ShirtViews | null>();
    const { result } = renderHook(() => useShareStory(() => pending.promise));

    let opening!: Promise<void>;
    act(() => {
      opening = result.current.open();
    });
    expect(result.current.state).toEqual({ status: "preparing" });

    await act(async () => {
      pending.resolve(views);
      await opening;
    });
    expect(result.current.state.status).toBe("ready");
  });

  it("ignores a second open while one is in progress (double tap)", async () => {
    const pending = deferred<ShirtViews | null>();
    const capture = vi.fn(() => pending.promise);
    const { result } = renderHook(() => useShareStory(capture));

    let first!: Promise<void>;
    act(() => {
      first = result.current.open();
      void result.current.open();
    });
    expect(capture).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(views);
      await first;
    });
  });

  it("goes to error when a capture comes back empty, and retry captures again", async () => {
    const capture = vi.fn<() => Promise<ShirtViews | null>>().mockResolvedValueOnce(null).mockResolvedValue(views);
    const { result } = renderHook(() => useShareStory(capture));

    await act(async () => {
      await result.current.open();
    });
    expect(result.current.state).toEqual({ status: "error" });
    expect(renderStory).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.retry();
    });
    expect(capture).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe("ready");
  });

  it("goes to error when the capture throws or the image cannot be composed", async () => {
    const { result, rerender } = renderHook(({ capture }) => useShareStory(capture), {
      initialProps: { capture: (async () => Promise.reject(new Error("tainted"))) as () => Promise<ShirtViews | null> },
    });
    await act(async () => {
      await result.current.open();
    });
    expect(result.current.state).toEqual({ status: "error" });

    renderStory.mockRejectedValueOnce(new Error("no blob"));
    rerender({ capture: async () => views });
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.state).toEqual({ status: "error" });
  });

  it("'anotherPhrase' recomposes with a different phrase without capturing again, and frees the old image", async () => {
    const capture = vi.fn(async () => views);
    const { result } = renderHook(() => useShareStory(capture));
    await act(async () => {
      await result.current.open();
    });
    const first = result.current.state;
    if (first.status !== "ready") throw new Error("unreachable");

    await act(async () => {
      await result.current.anotherPhrase();
    });

    const second = result.current.state;
    if (second.status !== "ready") throw new Error("unreachable");
    expect(second.phrase).not.toBe(first.phrase);
    expect(second.imageUrl).toBe("blob:story-2");
    expect(capture).toHaveBeenCalledTimes(1);
    expect(renderStory).toHaveBeenCalledTimes(2);
    expect(renderStory).toHaveBeenLastCalledWith(views, second.phrase);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-1");
  });

  it("closing while the camera is still turning leaves nothing behind, and opening again works", async () => {
    const pending = deferred<ShirtViews | null>();
    const capture = vi
      .fn<() => Promise<ShirtViews | null>>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValue(views);
    const { result } = renderHook(() => useShareStory(capture));

    let first!: Promise<void>;
    act(() => {
      first = result.current.open();
    });
    act(() => result.current.close());
    expect(result.current.state).toEqual({ status: "closed" });

    await act(async () => {
      pending.resolve(views);
      await first;
    });
    expect(result.current.state).toEqual({ status: "closed" });
    expect(renderStory).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.open();
    });
    expect(result.current.state.status).toBe("ready");
  });

  it("close frees the image, and so does unmounting", async () => {
    const { result, unmount } = renderHook(() => useShareStory(async () => views));
    await act(async () => {
      await result.current.open();
    });
    act(() => result.current.close());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-1");

    await act(async () => {
      await result.current.open();
    });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-2");
  });

  it("shares the composed image under a name taken from the project, with the address in the text", async () => {
    shareImage.mockResolvedValue("shared");
    const { result } = renderHook(() => useShareStory(async () => views));
    expect(await result.current.share("Los del Viernes")).toBeNull();

    await act(async () => {
      await result.current.open();
    });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.share("Los del Viernes");
    });

    expect(outcome).toBe("shared");
    const [blob, options] = shareImage.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(options.name).toBe("los-del-viernes-historia.png");
    expect(options.text).toContain(SHARE_URL);
  });
});
