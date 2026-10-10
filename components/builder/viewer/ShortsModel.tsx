"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";
import { PLACEHOLDER_SHORTS } from "@/lib/builder/geometry/shorts-model";
import { useDesign } from "@/lib/builder/state/design-context";
import { shortsColor } from "@/lib/builder/state/design-state";

// Provisional shape until the real shorts model is loaded (see SHORTS_MODEL).
export function ShortsModel() {
  const { state } = useDesign();
  const color = shortsColor(state);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.78, sheen: 0.4, sheenRoughness: 0.55 }),
    [color]
  );
  const { waistY, legHeight, legCenterX, topRadius, bottomRadius } = PLACEHOLDER_SHORTS;
  const legY = waistY - legHeight / 2;

  return (
    <group scale={0.01} position={[0, -JERSEY_CENTER_Y * 0.01, 0]}>
      {[-legCenterX, legCenterX].map((x) => (
        <mesh key={x} position={[x, legY, 0]} material={material} dispose={null}>
          <cylinderGeometry args={[topRadius, bottomRadius, legHeight, 24]} />
        </mesh>
      ))}
    </group>
  );
}
