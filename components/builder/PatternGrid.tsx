"use client";
import { useEffect, useState } from "react";
import type { PatternDef } from "@/lib/builder/patterns";
import { patternThumbnailUrl } from "@/lib/builder/pattern-thumbnail";
import { CheckIcon } from "./icons";

type ThumbProps = { svgPath: string; primary: string; secondary: string };

function PatternThumb({ svgPath, primary, secondary }: ThumbProps) {
  const key = `${svgPath}|${primary}|${secondary}`;
  const [result, setResult] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    patternThumbnailUrl(svgPath, { primary, secondary })
      .then((url) => {
        if (!cancelled) setResult({ key, url });
      })
      .catch((err) => {
        console.error("Failed to load pattern thumbnail", err);
        if (!cancelled) setResult({ key, url: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, svgPath, primary, secondary]);

  const current = result && result.key === key ? result : null;
  const status = !current ? "loading" : current.url ? "loaded" : "error";

  return (
    <div
      data-thumb={status}
      className="aspect-square w-full rounded-xl bg-black/5 bg-cover bg-center"
      style={current?.url ? { backgroundImage: `url("${current.url}")` } : undefined}
    />
  );
}

type Props = {
  patterns: PatternDef[];
  selectedId: string;
  primary: string;
  secondary: string;
  onSelect: (id: string) => void;
};

export function PatternGrid({ patterns, selectedId, primary, secondary, onSelect }: Props) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-3">
      {patterns.map((pattern) => {
        const selected = pattern.id === selectedId;
        return (
          <button
            key={pattern.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(pattern.id)}
            className={[
              "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/70 p-2 text-xs font-medium transition md:p-3 md:text-sm",
              selected ? "border-accent shadow-sm" : "border-transparent hover:border-line",
            ].join(" ")}
          >
            <PatternThumb svgPath={pattern.svgPath} primary={primary} secondary={secondary} />
            <span>{pattern.label}</span>
            {selected && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-foreground">
                <CheckIcon className="h-4 w-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
