// The welcome screen shown when the builder opens: it covers the builder while the 3D
// model loads, and lets the intro animation play out.
export type SplashPhase = "showing" | "leaving" | "gone";

// Long enough for the animation to play through, even if the model is ready sooner.
export const SPLASH_MIN_MS = 2800;
// If the model never reports it is ready, nobody is left staring at the splash.
export const SPLASH_MAX_MS = 8000;
// Matches the fade-out duration of SplashScreen.
export const SPLASH_FADE_MS = 500;

export const SPLASH_SEEN_KEY = "gepe:splash-seen";

// Once per session: coming back from the checkout ("Editar diseño") goes straight to the builder.
export function hasSeenSplash(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

export function markSplashSeen(): void {
  try {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
  } catch {
    // Without storage the splash simply shows again next time.
  }
}
