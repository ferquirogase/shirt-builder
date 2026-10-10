"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { addShortsSwayWeights } from "@/lib/builder/geometry/cloth-sway";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { SHORTS_MODEL } from "@/lib/builder/geometry/shorts-model";
import { useDesign } from "@/lib/builder/state/design-context";
import { shortsColor } from "@/lib/builder/state/design-state";
import { createBlendedNormalTexture } from "@/lib/builder/texture/fabric-texture";
import { applyClothSway } from "./cloth-sway-shader";
import { useClothSway } from "./ClothSwayProvider";
import { FABRIC_REPEAT, LINING_COLOR, WEAVE_STRENGTH } from "./fabric-look";

// The shorts wear one of the shirt's colors, with the model's wrinkle normal map
// and the fine knit on top, like the shirt. The OBJ is in the shirt's own
// coordinate frame, so it takes the shirt's scale and centring.
export function ShortsModel() {
  const { state } = useDesign();
  const color = shortsColor(state);
  const obj = useLoader(OBJLoader, SHORTS_MODEL.url);
  const [wrinkleSource] = useLoader(THREE.TextureLoader, [SHORTS_MODEL.normalMapUrl]);

  // A copy, so the cached OBJ is never touched; its waist swings with the shirt's hem.
  const geometry = useMemo(() => {
    const source = firstMeshGeometry(obj);
    if (!source) return null;
    const copy = source.clone();
    addShortsSwayWeights(copy);
    return copy;
  }, [obj]);
  const wrinkleNormal = useMemo(
    () =>
      createBlendedNormalTexture(wrinkleSource.image as CanvasImageSource, {
        repeat: FABRIC_REPEAT,
        flipBaseY: SHORTS_MODEL.normalMapFlipY,
        detailStrength: WEAVE_STRENGTH,
      }),
    [wrinkleSource]
  );

  // Matte polyester with a soft sheen, like the shirt.
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        normalMap: wrinkleNormal,
        normalScale: new THREE.Vector2(SHORTS_MODEL.normalMapStrength, SHORTS_MODEL.normalMapStrength),
        roughness: 0.78,
        sheen: 0.4,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color("#ffffff"),
      }),
    [color, wrinkleNormal]
  );
  const liningMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: LINING_COLOR, roughness: 0.9, side: THREE.BackSide }),
    []
  );

  // Same sway as the shirt (no ripple: the waist is flush against the shirt's hem).
  const sway = useClothSway();
  useEffect(() => {
    applyClothSway(material, sway, { ripple: false });
    applyClothSway(liningMaterial, sway, { ripple: false });
  }, [material, liningMaterial, sway]);

  if (!geometry) return null;
  return (
    <group scale={0.01} position={[0, -JERSEY_CENTER_Y * 0.01, 0]}>
      <mesh geometry={geometry} material={material} dispose={null} />
      <mesh geometry={geometry} material={liningMaterial} dispose={null} />
    </group>
  );
}
