"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderStory, type ShirtViews } from "./compose-story";
import { nextPhrase } from "./phrases";
import { shareImage, shareText, storyFileName, type ShareResult } from "./share-image";
import { SHARE_URL } from "./story-layout";

export type ShareStoryState =
  | { status: "closed" }
  | { status: "preparing" }
  | { status: "ready"; imageUrl: string; phrase: string }
  | { status: "error" };

// Drives the whole flow from event handlers (no effects that could run twice):
// capture the two sides, compose the image, show it, and recompose it with
// another phrase on demand. The captured shirts are kept so "otra frase" does
// not turn the camera again.
export function useShareStory(captureShirts: () => Promise<ShirtViews | null>) {
  const [state, setState] = useState<ShareStoryState>({ status: "closed" });
  // Bumped on every open and close: an async step that finds a newer number
  // belongs to a flow that was closed or replaced, and must not publish.
  const generation = useRef(0);
  const busy = useRef(false);
  const views = useRef<ShirtViews | null>(null);
  const blob = useRef<Blob | null>(null);
  const phrase = useRef<string | null>(null);
  const url = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
  }, []);

  // Free the image when the page goes away.
  useEffect(() => revoke, [revoke]);

  const publish = useCallback(
    (image: Blob, text: string) => {
      revoke();
      blob.current = image;
      phrase.current = text;
      url.current = URL.createObjectURL(image);
      setState({ status: "ready", imageUrl: url.current, phrase: text });
    },
    [revoke]
  );

  const open = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    generation.current += 1;
    const mine = generation.current;
    views.current = null;
    blob.current = null;
    revoke();
    setState({ status: "preparing" });
    try {
      const captured = await captureShirts();
      if (mine !== generation.current) return;
      if (!captured) throw new Error("The shirts could not be captured");
      views.current = captured;
      const first = nextPhrase(null);
      const image = await renderStory(captured, first);
      if (mine !== generation.current) return;
      publish(image, first);
    } catch {
      if (mine === generation.current) setState({ status: "error" });
    } finally {
      if (mine === generation.current) busy.current = false;
    }
  }, [captureShirts, publish, revoke]);

  const anotherPhrase = useCallback(async () => {
    const captured = views.current;
    if (!captured || busy.current) return;
    busy.current = true;
    const mine = generation.current;
    try {
      const next = nextPhrase(phrase.current);
      const image = await renderStory(captured, next);
      if (mine !== generation.current) return;
      publish(image, next);
    } catch {
      if (mine === generation.current) setState({ status: "error" });
    } finally {
      if (mine === generation.current) busy.current = false;
    }
  }, [publish]);

  const share = useCallback(async (projectName: string): Promise<ShareResult | null> => {
    if (!blob.current) return null;
    return shareImage(blob.current, { name: storyFileName(projectName), text: shareText(SHARE_URL) });
  }, []);

  const close = useCallback(() => {
    generation.current += 1;
    busy.current = false;
    views.current = null;
    blob.current = null;
    phrase.current = null;
    revoke();
    setState({ status: "closed" });
  }, [revoke]);

  return { state, open, retry: open, anotherPhrase, share, close };
}
