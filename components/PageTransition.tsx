import { ViewTransition, type ReactNode } from "react";

// Wraps a page's content so that moving between the builder and the checkout
// slides instead of cutting. Forward (nav-forward) and back (nav-back) are
// chosen by whoever navigates; anything else (reload, browser buttons) does not
// animate. It must be inside each page, never in a layout: layouts persist, so
// their enter and exit never fire.
const BY_DIRECTION = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" } as const;

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={BY_DIRECTION} exit={BY_DIRECTION} default="none">
      {children}
    </ViewTransition>
  );
}
