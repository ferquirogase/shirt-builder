"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useDesign } from "@/lib/builder/state/design-context";
import { shortsColor } from "@/lib/builder/state/design-state";
import { UV_FLIP_Y } from "@/lib/builder/geometry/uv-regions";
import { drawShortsToCanvas } from "@/lib/builder/texture/shorts-compositor";
import { loadSponsorImages, type SponsorImageCache, type SponsorImages } from "@/lib/builder/texture/sponsor-images";
import { useBrandLogos, useCrestImage, useNameNumberFont } from "./use-garment-images";

const CANVAS_SIZE = 2048;

// three.js only re-uploads a canvas texture to the GPU after being told to. This is a write to a
// three.js object, which is what effects are for; it lives in a function because
// `react-hooks/immutability` treats a memoized value that is also a hook dependency as frozen.
function flagForUpload(texture: THREE.Texture): void {
  texture.needsUpdate = true;
}

// Owns the shorts' texture: a canvas with the color the shorts wear, the sponsors on their legs, the
// crest, and the number with the maker's logo under it. It repaints whenever the design or a sponsor image changes, and returns the texture to
// put on the shorts.
export function useShortsTexture(): THREE.CanvasTexture {
  const { state } = useDesign();
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

  // Decodes the sponsor images. Cached by data URL, so moving a scale slider (which changes
  // `state.sponsors` but not the images) decodes nothing; a result that arrives after the design
  // moved on is ignored.
  useEffect(() => {
    let cancelled = false;
    loadSponsorImages(state.sponsors, sponsorCache.current).then((images) => {
      if (!cancelled) setSponsorImages(images);
    });
    return () => {
      cancelled = true;
    };
  }, [state.sponsors]);

  const logoImage = useCrestImage(state.logoDataUrl);
  const brandLogos = useBrandLogos();
  const font = useNameNumberFont(state.nameNumberStyle.presetId);

  const color = shortsColor(state);
  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawShortsToCanvas(
      ctx,
      CANVAS_SIZE,
      state,
      color,
      { sponsorImages, logoImage, brandLogoForLight: brandLogos.forLight, brandLogoForDark: brandLogos.forDark },
      font.family
    );
    flagForUpload(texture);
  }, [state, color, canvas, texture, sponsorImages, logoImage, brandLogos, font.family, font.version]);

  return texture;
}
