"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useDesign } from "@/lib/builder/state/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/catalog/patterns";
import { loadPatternImage, loadTintedMask } from "@/lib/builder/texture/image-loader";
import { drawDesignToCanvas } from "@/lib/builder/texture/texture-compositor";
import { UV_FLIP_Y } from "@/lib/builder/geometry/uv-regions";
import { JERSEY_MODEL } from "@/lib/builder/geometry/jersey-model";
import { loadSponsorImages, type SponsorImageCache, type SponsorImages } from "@/lib/builder/texture/sponsor-images";
import { useBrandLogos, useCrestImage, useNameNumberFont } from "./use-garment-images";

const CANVAS_SIZE = 2048;
// Pattern SVGs are re-fetched/re-rasterized only when the pattern choice or
// colors change. Debouncing this avoids refetching on every render caused by
// unrelated, continuously-changing inputs (color sliders, sponsor/name/number
// text fields).
const PATTERN_REDRAW_DEBOUNCE_MS = 80;

type PatternImages = {
  bodyPatternImage: HTMLImageElement | null;
  bodyBackPatternImage: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
  collarMaskImage: HTMLCanvasElement | null;
};

// three.js only re-uploads a canvas texture to the GPU after being told to. This
// is a write to a three.js object, which is what effects are for; it lives in a
// function because `react-hooks/immutability` treats a memoized value that is
// also a hook dependency as frozen and rejects a direct property write.
function flagForUpload(texture: THREE.Texture): void {
  texture.needsUpdate = true;
}

// Owns the jersey's texture: a canvas that the design is painted on, with every
// image that goes on it (patterns, crest, maker's logo, sponsors) and the
// name/number font loaded here. It repaints whenever the design or one of those
// images changes, and returns the texture to put on the shirt.
export function useJerseyTexture(): THREE.CanvasTexture {
  const { viewed: state } = useDesign();
  const [patternImages, setPatternImages] = useState<PatternImages>({
    bodyPatternImage: null,
    bodyBackPatternImage: null,
    sleevePatternImage: null,
    collarMaskImage: null,
  });
  const logoImage = useCrestImage(state.logoDataUrl);
  const brandLogos = useBrandLogos();
  const font = useNameNumberFont(state.nameNumberStyle.presetId);
  const sponsorCache = useRef<SponsorImageCache>(new Map());
  const [sponsorImages, setSponsorImages] = useState<SponsorImages>({});
  const canvas = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = CANVAS_SIZE;
    el.height = CANVAS_SIZE;
    return el;
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = UV_FLIP_Y;
    // The canvas holds sRGB hex colors; without this they render washed out.
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [canvas]);

  // Debounced: loads/caches the pattern SVGs. Keyed only on what can change
  // the rasterized pattern images, not the full design state, so typing in
  // text fields doesn't trigger a refetch.
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadPatterns() {
        const bodyPattern = BODY_PATTERNS.find((p) => p.id === state.bodyPatternId);
        const sleevePattern = SLEEVE_PATTERNS.find((p) => p.id === state.sleevePatternId);

        const [bodyPatternImage, bodyBackPatternImage, sleevePatternImage, collarMaskImage] = await Promise.all([
          bodyPattern ? loadPatternImage(bodyPattern.svgPath, state.colors) : Promise.resolve(null),
          // A broken back SVG must not break the shirt: fall back to the front image.
          bodyPattern?.svgPathBack
            ? loadPatternImage(bodyPattern.svgPathBack, state.colors).catch((err) => {
                console.error("Failed to load back pattern image", err);
                return null;
              })
            : Promise.resolve(null),
          sleevePattern ? loadPatternImage(sleevePattern.svgPath, state.colors) : Promise.resolve(null),
          JERSEY_MODEL.collarMaskUrl
            ? loadTintedMask(JERSEY_MODEL.collarMaskUrl, state.colors.collar)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setPatternImages({ bodyPatternImage, bodyBackPatternImage, sleevePatternImage, collarMaskImage });
      }

      loadPatterns().catch((err) => {
        console.error("Failed to load jersey pattern images", err);
      });
    }, PATTERN_REDRAW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [state.bodyPatternId, state.sleevePatternId, state.colors]);

  // Decodes the sponsor images. Cached by data URL, so moving a scale slider
  // (which changes `state.sponsors` but not the images) decodes nothing; a result
  // that arrives after the design moved on is ignored.
  useEffect(() => {
    let cancelled = false;
    loadSponsorImages(state.sponsors, sponsorCache.current).then((images) => {
      if (!cancelled) setSponsorImages(images);
    });
    return () => {
      cancelled = true;
    };
  }, [state.sponsors]);

  // Cheap and undebounced: redraws the canvas with whatever pattern/logo
  // images are currently cached, on every design state change.
  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawDesignToCanvas(
      ctx,
      CANVAS_SIZE,
      state,
      {
        bodyPatternImage: patternImages.bodyPatternImage,
        bodyBackPatternImage: patternImages.bodyBackPatternImage,
        sleevePatternImage: patternImages.sleevePatternImage,
        collarMaskImage: patternImages.collarMaskImage,
        logoImage,
        brandLogoForLight: brandLogos.forLight,
        brandLogoForDark: brandLogos.forDark,
        sponsorImages,
      },
      JERSEY_MODEL.uvRegions,
      font.family
    );
    flagForUpload(texture);
  }, [state, canvas, texture, patternImages, logoImage, brandLogos, sponsorImages, font.family, font.version]);

  return texture;
}
