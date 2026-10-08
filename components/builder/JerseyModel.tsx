"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { loadImage, loadPatternImage, loadTintedMask } from "@/lib/builder/image-loader";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { UV_FLIP_Y } from "@/lib/builder/uv-regions";
import { JERSEY_MODEL } from "@/lib/builder/jersey-model";
import { getNameNumberPreset } from "@/lib/builder/name-number-presets";
import { resolveFontFamily } from "@/lib/builder/resolve-font-family";
import { createBlendedNormalTexture, createFabricNormalTexture } from "@/lib/builder/fabric-texture";
import { findBoundaryLoops, pickNeckLoop, type Vec3 } from "@/lib/builder/mesh-boundary";
import { createNecklineRounding } from "@/lib/builder/neckline";
import { createGarmentReshape } from "@/lib/builder/garment-shape";
import { buildCollarGeometry, smoothLoop } from "@/lib/builder/collar-geometry";

const CANVAS_SIZE = 2048;
// One fabric-normal-map tile covers about this many model units (~cm), so the
// weave has the same scale on the body (UV-mapped) and on the collar.
const FABRIC_TILE_CM = 12;
// The weave has to be coarse enough to survive at the on-screen size of the shirt.
const JERSEY_FABRIC_REPEAT = 11;
const WEAVE_STRENGTH = 0.22; // how much of the weave's tilt is added to the wrinkles
// The interior of the garment, seen through the neck, hem and sleeve openings.
const LINING_COLOR = "#c9c3b6";
const COLLAR_OPTIONS = { halfWidth: 1.15, halfThickness: 0.22, radialSegments: 10, uvTile: FABRIC_TILE_CM };
const COLLAR_LOOP_POINTS = 192;
// Thin contrast tape sewn just inside the collar, as on the reference shirts.
const TAPE_OPTIONS = {
  halfWidth: 0.4,
  halfThickness: 0.14,
  radialSegments: 6,
  radialOffset: -1.2,
  upOffset: -0.1,
  uvTile: FABRIC_TILE_CM,
};
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

export function JerseyModel() {
  // The URL list is fixed per build, so the hook is always called the same way.
  const [obj, collarObj] = useLoader(
    OBJLoader,
    JERSEY_MODEL.collarUrl ? [JERSEY_MODEL.url, JERSEY_MODEL.collarUrl] : [JERSEY_MODEL.url]
  );
  // Wrinkle normal map in the model's UV layout (see jersey-model.ts).
  const [wrinkleSource] = useLoader(
    THREE.TextureLoader,
    JERSEY_MODEL.normalMapUrl ? [JERSEY_MODEL.normalMapUrl] : []
  );
  const { state } = useDesign();
  const logoUrlRef = useRef<string | null>(null);
  const [patternImages, setPatternImages] = useState<PatternImages>({
    bodyPatternImage: null,
    bodyBackPatternImage: null,
    sleevePatternImage: null,
    collarMaskImage: null,
  });
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  // Bumped when the name/number font finishes loading, to repaint the canvas
  // (the first paint would otherwise keep the fallback font).
  const [fontsVersion, setFontsVersion] = useState(0);
  const nnPreset = getNameNumberPreset(state.nameNumberStyle.presetId);

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

  const fabricNormal = useMemo(() => createFabricNormalTexture(JERSEY_FABRIC_REPEAT), []);
  const collarNormal = useMemo(() => createFabricNormalTexture(1), []);
  // The model's wrinkle normal map with the fine knit blended in. Both maps
  // share the one normal-map slot (three.js ignores bump maps when a normal
  // map is present), so they are combined here.
  const wrinkleNormal = useMemo(() => {
    if (!wrinkleSource) return null;
    return createBlendedNormalTexture(wrinkleSource.image as CanvasImageSource, {
      repeat: JERSEY_FABRIC_REPEAT,
      flipBaseY: JERSEY_MODEL.normalMapFlipY,
      detailStrength: WEAVE_STRENGTH,
    });
  }, [wrinkleSource]);

  // Matte polyester with a soft sheen, like the photographed GEPE shirts.
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: texture,
        normalMap: wrinkleNormal ?? fabricNormal,
        normalScale: wrinkleNormal
          ? new THREE.Vector2(JERSEY_MODEL.normalMapStrength, JERSEY_MODEL.normalMapStrength)
          : new THREE.Vector2(0.5, 0.5),
        roughness: 0.78,
        sheen: 0.4,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color("#ffffff"),
      }),
    [texture, wrinkleNormal, fabricNormal]
  );

  // The OBJ's neckline is too wide and square; reshape a copy of its geometry
  // (see neckline.ts). The cached OBJ itself is never modified, and the body is
  // rendered as our own mesh below so it can't fall back to the loader's
  // default grey material.
  const collarMaterial = useMemo(() => {
    const m = material.clone();
    m.side = THREE.DoubleSide;
    return m;
  }, [material]);

  const bodyGeometry = useMemo(() => {
    let source: THREE.BufferGeometry | null = null;
    obj.traverse((child) => {
      if (!source && child instanceof THREE.Mesh) source = child.geometry;
    });
    if (!source) return null;
    const geometry = (source as THREE.BufferGeometry).clone();
    const position = geometry.getAttribute("position");
    const loops = findBoundaryLoops(position.array);
    if (loops.length === 0) return geometry;
    const { reshapeBody, neckline } = JERSEY_MODEL;
    if (!reshapeBody && !neckline) return geometry;
    const shapeBody = reshapeBody ? createGarmentReshape() : (p: Vec3) => p;
    const reshapeNeck = neckline ? createNecklineRounding(pickNeckLoop(loops), neckline) : (p: Vec3) => p;
    for (let i = 0; i < position.count; i++) {
      const [x, y, z] = reshapeNeck(shapeBody([position.getX(i), position.getY(i), position.getZ(i)]));
      position.setXYZ(i, x, y, z);
    }
    position.needsUpdate = true;
    return geometry;
  }, [obj]);

  // A collar mesh that ships with the model, in the same coordinates as the body.
  const modelCollarGeometry = useMemo(() => {
    let found: THREE.BufferGeometry | null = null;
    collarObj?.traverse((child) => {
      if (!found && child instanceof THREE.Mesh) found = child.geometry;
    });
    return found as THREE.BufferGeometry | null;
  }, [collarObj]);

  // Without one, the collar is generated along the neckline edge.
  const { collarGeometry, tapeGeometry } = useMemo(() => {
    if (!bodyGeometry || JERSEY_MODEL.collarUrl) return { collarGeometry: null, tapeGeometry: null };
    const loops = findBoundaryLoops(bodyGeometry.getAttribute("position").array);
    if (loops.length === 0) return { collarGeometry: null, tapeGeometry: null };
    const neck = smoothLoop(pickNeckLoop(loops), COLLAR_LOOP_POINTS);
    return {
      collarGeometry: buildCollarGeometry(neck, COLLAR_OPTIONS),
      tapeGeometry: buildCollarGeometry(neck, TAPE_OPTIONS),
    };
  }, [bodyGeometry]);

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

  // Loads the chosen name/number font on demand (the fonts are declared with
  // preload: false) and asks for a repaint once it is available.
  useEffect(() => {
    let cancelled = false;
    const family = resolveFontFamily(nnPreset.cssVar);
    document.fonts
      .load(`${nnPreset.weight} 48px ${family}`, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
      .then(() => {
        if (!cancelled) setFontsVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Failed to load name/number font", err);
      });
    return () => {
      cancelled = true;
    };
  }, [nnPreset]);

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
      },
      JERSEY_MODEL.uvRegions,
      resolveFontFamily(nnPreset.cssVar)
    );
    texture.needsUpdate = true;
  }, [state, canvas, texture, patternImages, logoImage, fontsVersion, nnPreset]);

  // The OBJ's vertex coordinates are in the hundreds, so scale=0.01 brings the
  // model to roughly a metre, a reasonable size for the camera/OrbitControls
  // setup in Viewer3D. The reshaped mesh is re-centred vertically so the
  // camera and OrbitControls target (the scene origin) stay on the shirt.
  const centerY = useMemo(() => {
    if (!bodyGeometry) return 0;
    bodyGeometry.computeBoundingBox();
    const box = bodyGeometry.boundingBox!;
    return (box.min.y + box.max.y) / 2;
  }, [bodyGeometry]);

  return (
    <group scale={0.01} position={[0, -centerY * 0.01, 0]}>
      {bodyGeometry && (
        <>
          <mesh geometry={bodyGeometry} material={material} dispose={null} />
          <mesh geometry={bodyGeometry} dispose={null}>
            <meshStandardMaterial color={LINING_COLOR} roughness={0.9} side={THREE.BackSide} />
          </mesh>
        </>
      )}
      {modelCollarGeometry && (
        // Its UVs sit inside the body island of the same atlas, so it takes the
        // same texture and the pattern continues up to the collar.
        <mesh geometry={modelCollarGeometry} material={collarMaterial} dispose={null} />
      )}
      {collarGeometry && (
        <mesh geometry={collarGeometry} dispose={null}>
          <meshPhysicalMaterial
            color={state.colors.collar}
            normalMap={collarNormal}
            normalScale={new THREE.Vector2(0.35, 0.35)}
            roughness={0.82}
            sheen={0.4}
            sheenRoughness={0.55}
          />
        </mesh>
      )}
      {tapeGeometry && (
        <mesh geometry={tapeGeometry} dispose={null}>
          <meshStandardMaterial color={state.colors.primary} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}
