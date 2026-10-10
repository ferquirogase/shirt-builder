"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { JERSEY_MODEL } from "@/lib/builder/geometry/jersey-model";
import { createBlendedNormalTexture, createFabricNormalTexture } from "@/lib/builder/texture/fabric-texture";
import { azimuthOf, shortestDelta } from "@/lib/builder/geometry/camera-math";
import {
  SWAY_ATTRIBUTE,
  addSwayWeights,
  stepSpring,
  swayTarget,
  type SpringState,
} from "@/lib/builder/geometry/cloth-sway";
import { prepareJerseyGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { applyClothSway, updateClothSway } from "./cloth-sway-shader";
import { useClothSway } from "./ClothSwayProvider";
import { FABRIC_REPEAT, LINING_COLOR, WEAVE_STRENGTH } from "./fabric-look";
import { useJerseyTexture } from "./use-jersey-texture";


export function JerseyModel() {
  const [obj, collarObj] = useLoader(OBJLoader, [JERSEY_MODEL.url, JERSEY_MODEL.collarUrl]);
  // Wrinkle normal map in the model's UV layout (see jersey-model.ts).
  const [wrinkleSource] = useLoader(
    THREE.TextureLoader,
    JERSEY_MODEL.normalMapUrl ? [JERSEY_MODEL.normalMapUrl] : []
  );

  const texture = useJerseyTexture();

  const fabricNormal = useMemo(() => createFabricNormalTexture(FABRIC_REPEAT), []);
  // The model's wrinkle normal map with the fine knit blended in. Both maps
  // share the one normal-map slot (three.js ignores bump maps when a normal
  // map is present), so they are combined here.
  const wrinkleNormal = useMemo(() => {
    if (!wrinkleSource) return null;
    return createBlendedNormalTexture(wrinkleSource.image as CanvasImageSource, {
      repeat: FABRIC_REPEAT,
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

  // Sleeves and hem swing behind the camera as it orbits (see cloth-sway.ts).
  const sway = useClothSway();
  const liningMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: LINING_COLOR, roughness: 0.9, side: THREE.BackSide }),
    []
  );
  useEffect(() => {
    if (bodyGeometry && !bodyGeometry.getAttribute(SWAY_ATTRIBUTE)) addSwayWeights(bodyGeometry);
    applyClothSway(material, sway);
    applyClothSway(liningMaterial, sway);
  }, [bodyGeometry, material, liningMaterial, sway]);

  const spring = useRef<SpringState>({ value: 0, velocity: 0 });
  const lastAzimuth = useRef<number | null>(null);
  useFrame(({ camera, clock }, delta) => {
    const azimuth = azimuthOf(camera.position.x, camera.position.z);
    const previous = lastAzimuth.current ?? azimuth;
    lastAzimuth.current = azimuth;
    const orbitSpeed = delta > 0 ? shortestDelta(previous, azimuth) / delta : 0;
    spring.current = stepSpring(spring.current, swayTarget(orbitSpeed), delta);
    updateClothSway(sway, azimuth, spring.current.value, clock.elapsedTime);
  });

  // The OBJ's vertex coordinates are in the hundreds, so scale=0.01 brings the
  // model to roughly a metre, a reasonable size for the camera/OrbitControls
  // setup in Viewer3D. The mesh is re-centred vertically (centerY) so the camera
  // and OrbitControls target (the scene origin) stay on the shirt.
  return (
    <group scale={0.01} position={[0, -centerY * 0.01, 0]}>
      {bodyGeometry && (
        <>
          <mesh geometry={bodyGeometry} material={material} dispose={null} />
          <mesh geometry={bodyGeometry} material={liningMaterial} dispose={null} />
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
