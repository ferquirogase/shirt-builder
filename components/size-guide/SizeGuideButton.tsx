"use client";
import { useState } from "react";
import { RulerIcon } from "@/components/builder/icons";
import type { SizeGuide } from "@/lib/checkout/size-guides";
import { SizeGuideDialog } from "./SizeGuideDialog";

type Props = {
  /** The chart it opens on. */
  initial?: SizeGuide["id"];
  className: string;
};

// "Ver talles" in the builder: it opens the size chart over whatever is open, with both charts,
// shirt and shorts, so the sizes can be checked before the shorts are even added.
export function SizeGuideButton({ initial = "shirt", className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Ver talles" onClick={() => setOpen(true)} className={className}>
        <RulerIcon className="h-4 w-4 shrink-0" />
        Talles
      </button>
      <SizeGuideDialog open={open} withShorts initial={initial} onClose={() => setOpen(false)} />
    </>
  );
}
