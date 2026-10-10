import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false on the server and during hydration, true afterwards. Lets a component
// read sessionStorage without the server and client markup disagreeing.
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
