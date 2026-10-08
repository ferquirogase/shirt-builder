"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useDesign } from "@/lib/builder/state/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/catalog/patterns";
import { loadImage, loadPatternImage, loadTintedMask } from "@/lib/builder/texture/image-loader";
import { drawDesignToCanvas } from "@/lib/builder/texture/texture-compositor";
import { UV_FLIP_Y } from "@/lib/builder/geometry/uv-regions";
import { JERSEY_MODEL } from "@/lib/builder/geometry/jersey-model";
import { BRAND_LOGO_URLS } from "@/lib/builder/catalog/brand-logo";
import { loadSponsorImages, type SponsorImageCache, type SponsorImages } from "@/lib/builder/texture/sponsor-images";
import { getNameNumberPreset } from "@/lib/builder/catalog/name-number-presets";
import { resolveFontFamily } from "@/lib/builder/texture/resolve-font-family";
import { createBlendedNormalTexture, createFabricNormalTexture } from "@/lib/builder/texture/fabric-texture";
import { prepareJerseyGeometry } from "@/lib/builder/geometry/jersey-geometry";

const CANVAS_SIZE = 2048;
// The weave has to be coarse enough to survive at the on-screen size of the shirt.
const JERSEY_FABRIC_REPEAT = 11;
const WEAVE_STRENGTH = 0.22; // how much of the weave's tilt is added to the wrinkles
// The interior of the garment, seen through the neck, hem and sleeve openings.
const LINING_COLOR = "#c9c3b6";
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
  const [obj, collarObj] = useLoader(OBJLoader, [JERSEY_MODEL.url, JERSEY_MODEL.collarUrl]);
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
  const [brandLogos, setBrandLogos] = useState<{ forLight: HTMLImageElement | null; forDark: HTMLImageElement | null }>({
    forLight: null,
    forDark: null,
  });
  const sponsorCache = useRef<SponsorImageCache>(new Map());
  const [sponsorImages, setSponsorImages] = useState<SponsorImages>({});
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

  // The collar takes the same texture as the body, drawn on both sides.
  const collarMaterial = useMemo(() => {
    const m = material.clone();
    m.side = THREE.DoubleSide;
    return m;
  }, [material]);

  // The body is rendered as our own mesh below so it can't fall back to the
  // loader's default grey material.
  const {
    body: bodyGeometry,
    collar: modelCollarGeometry,
    centerY,
  } = useMemo(() => prepareJerseyGeometry(obj, collarObj), [obj, collarObj]);

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

  // The maker's logo never changes: load both versions once. A broken one must
  // not break the shirt, so each failure just leaves that version out.
  useEffect(() => {
    let cancelled = false;
    const load = (src: string) =>
      loadImage(src).catch((err) => {
        console.error("Failed to load brand logo", err);
        return null;
      });
    Promise.all([load(BRAND_LOGO_URLS.forLight), load(BRAND_LOGO_URLS.forDark)]).then(([forLight, forDark]) => {
      if (!cancelled) setBrandLogos({ forLight, forDark });
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        brandLogoForLight: brandLogos.forLight,
        brandLogoForDark: brandLogos.forDark,
        sponsorImages,
      },
      JERSEY_MODEL.uvRegions,
      resolveFontFamily(nnPreset.cssVar)
    );
    texture.needsUpdate = true;
  }, [state, canvas, texture, patternImages, logoImage, brandLogos, sponsorImages, fontsVersion, nnPreset]);

  // The OBJ's vertex coordinates are in the hundreds, so scale=0.01 brings the
  // model to roughly a metre, a reasonable size for the camera/OrbitControls
  // setup in Viewer3D. The mesh is re-centred vertically (centerY) so the camera
  // and OrbitControls target (the scene origin) stay on the shirt.
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
    </group>
  );
}
