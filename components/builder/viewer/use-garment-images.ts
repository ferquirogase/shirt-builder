"use client";
import { useEffect, useRef, useState } from "react";
import { BRAND_LABEL_URLS, BRAND_LOGO_URLS, SHORTS_SIDE_MARK_URLS } from "@/lib/builder/catalog/brand-logo";
import { getNameNumberPreset } from "@/lib/builder/catalog/name-number-presets";
import { loadImage } from "@/lib/builder/texture/image-loader";
import { resolveFontFamily } from "@/lib/builder/texture/resolve-font-family";

// The images and the font that go on the shirt and on the shorts alike: the crest, the maker's logo
// and the name/number font. Each garment's texture hook loads them with these.

/** The crest as an image, decoded once its data URL changes (a discrete upload, not a continuous input). */
export function useCrestImage(dataUrl: string | null): HTMLImageElement | null {
  const loadedUrl = useRef<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (dataUrl && loadedUrl.current !== dataUrl) {
        const img = await loadImage(dataUrl);
        if (cancelled) return;
        loadedUrl.current = dataUrl;
        setImage(img);
      } else if (!dataUrl) {
        loadedUrl.current = null;
        setImage(null);
      }
    }
    load().catch((err) => {
      console.error("Failed to load jersey logo image", err);
    });
    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  return image;
}

type LightDarkPair = { forLight: HTMLImageElement | null; forDark: HTMLImageElement | null };

// Two versions of a fixed image (for light cloth and for dark cloth), loaded once. A broken one must not break
// the garment, so each failure just leaves that version out.
function useLightDarkPair(urls: { forLight: string; forDark: string }, what: string): LightDarkPair {
  const [pair, setPair] = useState<LightDarkPair>({ forLight: null, forDark: null });
  const { forLight: lightUrl, forDark: darkUrl } = urls;

  useEffect(() => {
    let cancelled = false;
    const load = (src: string) =>
      loadImage(src).catch((err) => {
        console.error(`Failed to load ${what}`, err);
        return null;
      });
    Promise.all([load(lightUrl), load(darkUrl)]).then(([forLight, forDark]) => {
      if (!cancelled) setPair({ forLight, forDark });
    });
    return () => {
      cancelled = true;
    };
  }, [lightUrl, darkUrl, what]);

  return pair;
}

/** The maker's logo never changes: both versions are loaded once. */
export function useBrandLogos(): LightDarkPair {
  return useLightDarkPair(BRAND_LOGO_URLS, "brand logo");
}

/** The shorts' side mark, both versions, loaded once. */
export function useShortsSideMarks(): LightDarkPair {
  return useLightDarkPair(SHORTS_SIDE_MARK_URLS, "shorts side mark");
}

/** The shirt's brand labels never change either: loaded once, and a broken one is just left out. */
export function useBrandLabels(): { front: HTMLImageElement | null; back: HTMLImageElement | null } {
  const [labels, setLabels] = useState<{ front: HTMLImageElement | null; back: HTMLImageElement | null }>({
    front: null,
    back: null,
  });

  useEffect(() => {
    let cancelled = false;
    const load = (src: string) =>
      loadImage(src).catch((err) => {
        console.error("Failed to load brand label", err);
        return null;
      });
    Promise.all([load(BRAND_LABEL_URLS.front), load(BRAND_LABEL_URLS.back)]).then(([front, back]) => {
      if (!cancelled) setLabels({ front, back });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return labels;
}

/**
 * Loads the font of a name/number style on demand (the fonts are declared with preload: false) and
 * says when it is ready, so the texture is painted again (the first paint would keep the fallback).
 * Returns the font family to paint with, and a number that changes when a font has loaded.
 */
export function useNameNumberFont(presetId: string): { family: string; version: number } {
  const preset = getNameNumberPreset(presetId);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const family = resolveFontFamily(preset.cssVar);
    document.fonts
      .load(`${preset.weight} 48px ${family}`, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
      .then(() => {
        if (!cancelled) setVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Failed to load name/number font", err);
      });
    return () => {
      cancelled = true;
    };
  }, [preset]);

  return { family: resolveFontFamily(preset.cssVar), version };
}
