"use client";
import { useId } from "react";
import { formatCmyk } from "@/lib/builder/color/cmyk";
import { PALETTE, colorName, findPaletteColor } from "@/lib/builder/color/palette";
import { CheckIcon } from "../icons";

// One color the player can change: a button with its label, the name of the color and its CMYK, that
// opens into the palette right below it. Picking a color closes it. Which field is open is up to the
// panel (so only one is at a time).
export function ColorField({
  label,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  label: string;
  value: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (hex: string) => void;
}) {
  const paletteId = useId();
  const name = colorName(value);
  const current = findPaletteColor(value);

  return (
    <div className="rounded-2xl bg-white/70">
      <button
        type="button"
        aria-label={`${label}: ${name}`}
        aria-expanded={open}
        aria-controls={paletteId}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
      >
        <span className="flex min-w-0 flex-col">
          {label}
          <span className="truncate text-xs font-normal text-muted">{name}</span>
          <span className="font-mono text-xs font-normal text-muted">{formatCmyk(value)}</span>
        </span>
        <span
          data-current-swatch
          aria-hidden="true"
          className="h-10 w-14 shrink-0 rounded-lg border border-line"
          style={{ backgroundColor: value }}
        />
      </button>

      {open && (
        <div
          id={paletteId}
          role="radiogroup"
          aria-label={label}
          className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] justify-items-center px-2 pb-3"
        >
          {PALETTE.map((color) => {
            const checked = current?.hex === color.hex;
            return (
              <button
                key={color.hex}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={color.name}
                title={color.name}
                onClick={() => {
                  onChange(color.hex);
                  onOpenChange(false);
                }}
                className="group flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-transform group-hover:scale-110 ${
                    checked ? "border-foreground ring-2 ring-foreground ring-offset-2" : "border-black/15"
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {/* The tick reads against the swatch: dark on the light ones. */}
                  {checked && (
                    <span style={{ color: color.hex === "#ffffff" || color.hex === "#f5b700" ? "#000" : "#fff" }}>
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
