"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  SPLASH_FADE_MS,
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
  hasSeenSplash,
  markSplashSeen,
  type SplashPhase,
} from "./splash";

const subscribe = () => () => {};

// The server and the hydration render both say "not seen" (the HTML already carries the
// splash); right after, the client reads whether this session saw it before.
export function useSplash(modelReady: boolean): SplashPhase {
  const alreadySeen = useSyncExternalStore(subscribe, hasSeenSplash, () => false);
  const [minDone, setMinDone] = useState(false);
  const [maxDone, setMaxDone] = useState(false);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (alreadySeen) return;
    const timers = [setTimeout(() => setMinDone(true), SPLASH_MIN_MS), setTimeout(() => setMaxDone(true), SPLASH_MAX_MS)];
    return () => timers.forEach(clearTimeout);
  }, [alreadySeen]);

  const finished = !alreadySeen && minDone && (modelReady || maxDone);

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => {
      // Marked only at the end: leaving the page halfway does not count as having seen it.
      markSplashSeen();
      setFaded(true);
    }, SPLASH_FADE_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  if (alreadySeen || faded) return "gone";
  return finished ? "leaving" : "showing";
}
