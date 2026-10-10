"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { addShortsSwayWeights } from "@/lib/builder/geometry/cloth-sway";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { SHORTS_MODEL } from "@/lib/builder/geometry/shorts-model";
import { buildKitCollider } from "@/lib/builder/geometry/shorts-collider";
import { useDesign } from "@/lib/builder/state/design-context";
import { shortsColor } from "@/lib/builder/state/design-state";
import { createBlendedNormalTexture } from "@/lib/builder/texture/fabric-texture";
import { applyClothSway, setClothCollider } from "./cloth-sway-shader";
import { useClothSway } from "./ClothSwayProvider";
import { FABRIC_REPEAT, LINING_COLOR, WEAVE_STRENGTH } from "./fabric-look";

// The shorts wear one of the shirt's colors, with the model's wrinkle normal map
// and the fine knit on top, like the shirt. The OBJ is in the shirt's own
// coordinate frame, so it takes the shirt's scale and centring. The waist stays
// still, and the shirt's swaying hem is kept out of it (see shorts-collider.ts);
// the legs' bottom edge swings with the same sway as the shirt.
export function ShortsModel() {
  const { state } = useDesign();
  const color = shortsColor(state);
  const obj = useLoader(OBJLoader, SHORTS_MODEL.url);
  const [wrinkleSource] = useLoader(THREE.TextureLoader, [SHORTS_MODEL.normalMapUrl]);

  const geometry = useMemo(() => firstMeshGeometry(obj), [obj]);
  // A copy, so the cached OBJ is never touched, carrying the legs' sway weights. The
  // collider is built from the original: the waist, where they differ, is identical.
  const swayingGeometry = useMemo(() => {
    const copy = geometry?.clone() ?? null;
    if (copy) addShortsSwayWeights(copy);
    return copy;
  }, [geometry]);

  // The shirt's shader gets the shorts' shape from the hem up to their waist, and
  // lets go of it when the shorts are taken off.
  const collider = useMemo(() => (geometry ? buildKitCollider(geometry) : null), [geometry]);
  const sway = useClothSway();
  useEffect(() => {
    setClothCollider(sway, collider);
    return () => setClothCollider(sway, null);
  }, [sway, collider]);
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

  // The shorts sway like the shirt but must not be pushed by the collider meant for it.
  useEffect(() => {
    applyClothSway(material, sway, { collide: false });
    applyClothSway(liningMaterial, sway, { collide: false });
  }, [material, liningMaterial, sway]);

  if (!swayingGeometry) return null;
  return (
    <group scale={0.01} position={[0, -JERSEY_CENTER_Y * 0.01, 0]}>
      <mesh geometry={swayingGeometry} material={material} dispose={null} />
      <mesh geometry={swayingGeometry} material={liningMaterial} dispose={null} />
    </group>
  );
}
