import Link from "next/link";
import type { ReactNode } from "react";
import { stageBaseCss } from "@/lib/builder/stage-style";

export function CheckoutShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: stageBaseCss() }}>
      <header className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link href="/" className="text-2xl font-black tracking-tight md:text-3xl">
          GEPE<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
        </Link>
        <div className="h-8 w-px bg-line" />
        <h1 className="text-base font-semibold">{title}</h1>
      </header>
      {/* Bottom padding leaves room for the fixed total bar on mobile. */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 md:px-6 md:pb-10">{children}</div>
    </div>
  );
}
