"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { loadImage, loadPatternImage } from "@/lib/builder/image-loader";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { UV_REGIONS, UV_FLIP_Y } from "@/lib/builder/uv-regions";

const CANVAS_SIZE = 2048;

export function JerseyModel() {
  const obj = useLoader(OBJLoader, "/models/jersey_ss.obj");
  const { state } = useDesign();
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const logoUrlRef = useRef<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    async function redraw() {
      const bodyPattern = BODY_PATTERNS.find((p) => p.id === state.bodyPatternId);
      const sleevePattern = SLEEVE_PATTERNS.find((p) => p.id === state.sleevePatternId);

      const [bodyPatternImage, sleevePatternImage] = await Promise.all([
        bodyPattern ? loadPatternImage(bodyPattern.svgPath, state.colors) : Promise.resolve(null),
        sleevePattern ? loadPatternImage(sleevePattern.svgPath, state.colors) : Promise.resolve(null),
      ]);

      if (state.logoDataUrl && logoUrlRef.current !== state.logoDataUrl) {
        logoImageRef.current = await loadImage(state.logoDataUrl);
        logoUrlRef.current = state.logoDataUrl;
      } else if (!state.logoDataUrl) {
        logoImageRef.current = null;
        logoUrlRef.current = null;
      }

      if (cancelled) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawDesignToCanvas(
        ctx,
        CANVAS_SIZE,
        state,
        { bodyPatternImage, sleevePatternImage, logoImage: logoImageRef.current },
        UV_REGIONS
      );
      texture.needsUpdate = true;
    }

    redraw();

    return () => {
      cancelled = true;
    };
  }, [state, canvas, texture]);

  // The OBJ's vertex coordinates are in the hundreds (bounding box measured
  // as roughly x:[-68.5, 68.5], y:[161.8, 298.1], z:[-29.8, 27.8]), so
  // scale=0.01 brings the model to a ~1.37m x 1.36m x 0.58m box, a
  // reasonable size for the camera/OrbitControls setup in Viewer3D.
  // The mesh's vertical center in OBJ space is at y ~= 230, i.e. y ~= 2.3
  // after scaling, so a position offset is applied to bring it back to the
  // scene origin (where the camera and OrbitControls target are aimed).
  return <primitive object={obj} scale={0.01} position={[0, -2.3, 0]} />;
}
