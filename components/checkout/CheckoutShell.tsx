import Link from "next/link";
import type { ReactNode } from "react";
import { stageBaseCss } from "@/lib/builder/stage-style";

// `splitScroll`: on desktop the page itself does not scroll; the columns inside `children` do, each on its own.
export function CheckoutShell({
  title,
  children,
  splitScroll = false,
}: {
  title: string;
  children: ReactNode;
  splitScroll?: boolean;
}) {
  return (
    <div className={`min-h-dvh ${splitScroll ? "md:flex md:h-dvh md:flex-col md:overflow-hidden" : ""}`} style={{ background: stageBaseCss() }}>
      <header className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link href="/" transitionTypes={["nav-back"]} className="text-2xl font-black tracking-tight md:text-3xl">
          GEPE<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
        </Link>
        <div className="h-8 w-px bg-line" />
        <h1 className="text-base font-semibold">{title}</h1>
      </header>
      {/* Bottom padding leaves room for the fixed total bar on mobile. */}
      <div
        className={`mx-auto w-full max-w-6xl px-4 pb-28 md:px-6 md:pb-10 ${
          splitScroll ? "md:flex md:min-h-0 md:flex-1 md:flex-col md:pb-6" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
