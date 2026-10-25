// The welcome screen shown when the builder opens: it covers the builder while the 3D
// model loads, and lets the intro animation play out.
export type SplashPhase = "showing" | "leaving" | "gone";

// Long enough for the animation to play through, even if the model is ready sooner.
export const SPLASH_MIN_MS = 2800;
// If the model never reports it is ready, nobody is left staring at the splash.
export const SPLASH_MAX_MS = 8000;
// What the splash says while it waits, one line at a time, in the order a team gets ready.
export const SPLASH_PHRASES = [
  "Atando los cordones…",
  "Entrando en calor…",
  "Armando la formación…",
  "Saliendo a la cancha…",
] as const;
// How long each phrase stays on screen. The whole round repeats if loading takes longer.
export const SPLASH_PHRASE_MS = 1100;
// Matches the fade-out duration of SplashScreen.
export const SPLASH_FADE_MS = 500;

// Once per page load, not per session: a reload shows it again, but coming back from the
// checkout ("Editar diseño") is a client-side navigation, which keeps this module alive and
// goes straight to the builder.
let seen = false;

export function hasSeenSplash(): boolean {
  return seen;
}

export function markSplashSeen(): void {
  seen = true;
}

// For tests: a fresh page load.
export function forgetSplash(): void {
  seen = false;
}
