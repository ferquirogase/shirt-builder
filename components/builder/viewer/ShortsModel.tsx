"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { SHORTS_MODEL } from "@/lib/builder/geometry/shorts-model";
import { useDesign } from "@/lib/builder/state/design-context";
import { shortsColor } from "@/lib/builder/state/design-state";
import { createBlendedNormalTexture } from "@/lib/builder/texture/fabric-texture";
import { FABRIC_REPEAT, LINING_COLOR, WEAVE_STRENGTH } from "./fabric-look";

// The shorts wear one of the shirt's colors, with the model's wrinkle normal map
// and the fine knit on top, like the shirt. The OBJ is in the shirt's own
// coordinate frame, so it takes the shirt's scale and centring.
export function ShortsModel() {
  const { state } = useDesign();
  const color = shortsColor(state);
  const obj = useLoader(OBJLoader, SHORTS_MODEL.url);
  const [wrinkleSource] = useLoader(THREE.TextureLoader, [SHORTS_MODEL.normalMapUrl]);

  const geometry = useMemo(() => firstMeshGeometry(obj), [obj]);
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

  if (!geometry) return null;
  return (
    <group scale={0.01} position={[0, -JERSEY_CENTER_Y * 0.01, 0]}>
      <mesh geometry={geometry} material={material} dispose={null} />
      <mesh geometry={geometry} material={liningMaterial} dispose={null} />
    </group>
  );
}
