"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { loadImage, loadPatternImage } from "@/lib/builder/image-loader";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { UV_REGIONS, UV_FLIP_Y } from "@/lib/builder/uv-regions";

const CANVAS_SIZE = 2048;
// Pattern SVGs are re-fetched/re-rasterized only when the pattern choice or
// colors change. Debouncing this avoids refetching on every render caused by
// unrelated, continuously-changing inputs (color sliders, sponsor/name/number
// text fields).
const PATTERN_REDRAW_DEBOUNCE_MS = 80;

type PatternImages = {
  bodyPatternImage: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
};

export function JerseyModel() {
  const obj = useLoader(OBJLoader, "/models/jersey_ss.obj");
  const { state } = useDesign();
  const logoUrlRef = useRef<string | null>(null);
  const [patternImages, setPatternImages] = useState<PatternImages>({
    bodyPatternImage: null,
    sleevePatternImage: null,
  });
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  const canvas = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = CANVAS_SIZE;
    el.height = CANVAS_SIZE;
    return el;
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = UV_FLIP_Y;
    return tex;
  }, [canvas]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: texture }), [texture]);

  useEffect(() => {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });
  }, [obj, material]);

  // Debounced: loads/caches the pattern SVGs. Keyed only on what can change
  // the rasterized pattern images, not the full design state, so typing in
  // text fields doesn't trigger a refetch.
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadPatterns() {
        const bodyPattern = BODY_PATTERNS.find((p) => p.id === state.bodyPatternId);
        const sleevePattern = SLEEVE_PATTERNS.find((p) => p.id === state.sleevePatternId);

        const [bodyPatternImage, sleevePatternImage] = await Promise.all([
          bodyPattern ? loadPatternImage(bodyPattern.svgPath, state.colors) : Promise.resolve(null),
          sleevePattern ? loadPatternImage(sleevePattern.svgPath, state.colors) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setPatternImages({ bodyPatternImage, sleevePatternImage });
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

  // Undebounced: loads the logo image only when its data URL actually
  // changes (a discrete upload, not a continuous input).
  useEffect(() => {
    let cancelled = false;

    async function loadLogo() {
      if (state.logoDataUrl && logoUrlRef.current !== state.logoDataUrl) {
        const img = await loadImage(state.logoDataUrl);
        if (cancelled) return;
        logoUrlRef.current = state.logoDataUrl;
        setLogoImage(img);
      } else if (!state.logoDataUrl) {
        logoUrlRef.current = null;
        setLogoImage(null);
      }
    }

    loadLogo().catch((err) => {
      console.error("Failed to load jersey logo image", err);
    });

    return () => {
      cancelled = true;
    };
  }, [state.logoDataUrl]);

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
        sleevePatternImage: patternImages.sleevePatternImage,
        logoImage,
      },
      UV_REGIONS
    );
    texture.needsUpdate = true;
  }, [state, canvas, texture, patternImages, logoImage]);

  // The OBJ's vertex coordinates are in the hundreds (bounding box measured
  // as roughly x:[-68.5, 68.5], y:[161.8, 298.1], z:[-29.8, 27.8]), so
  // scale=0.01 brings the model to a ~1.37m x 1.36m x 0.58m box, a
  // reasonable size for the camera/OrbitControls setup in Viewer3D.
  // The mesh's vertical center in OBJ space is at y ~= 230, i.e. y ~= 2.3
  // after scaling, so a position offset is applied to bring it back to the
  // scene origin (where the camera and OrbitControls target are aimed).
  return <primitive object={obj} scale={0.01} position={[0, -2.3, 0]} />;
}
