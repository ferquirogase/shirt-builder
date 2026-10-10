import * as THREE from "three";
import { SWAY_ATTRIBUTE } from "@/lib/builder/geometry/cloth-sway";

// Amplitude (OBJ units) and speed of the small ripple that keeps the cloth
// alive even when the camera is still.
const RIPPLE_AMPLITUDE = 0.5;
const RIPPLE_SPEED = 1.6;

export type ClothSwayUniforms = {
  /** Horizontal direction the cloth is pushed in, already scaled by the sway amount. */
  uSway: { value: THREE.Vector3 };
  uTime: { value: number };
};

export function createClothSwayUniforms(): ClothSwayUniforms {
  return { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } };
}

/**
 * Makes `material` displace its vertices by their `swayWeight`. Safe to call
 * once per material. `ripple: false` keeps only the sway, for a garment that
 * has to stay flush against another (the shorts under the shirt's hem).
 */
export function applyClothSway(
  material: THREE.Material,
  uniforms: ClothSwayUniforms,
  { ripple = true }: { ripple?: boolean } = {}
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSway = uniforms.uSway;
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float ${SWAY_ATTRIBUTE};
uniform vec3 uSway;
uniform float uTime;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float swayW = ${SWAY_ATTRIBUTE};
// Squared so the part near the body barely moves and the free edge swings most.
transformed += uSway * (swayW * swayW);
transformed += normal * sin(position.y * 0.12 + position.x * 0.09 + uTime * ${RIPPLE_SPEED.toFixed(2)}) * ${(ripple ? RIPPLE_AMPLITUDE : 0).toFixed(2)} * swayW;`
      );
  };
  material.customProgramCacheKey = () => (ripple ? "cloth-sway" : "cloth-sway-still");
  material.needsUpdate = true;
}

/** Per-frame update: pushes the cloth along the orbit tangent at `azimuth` by `amount`. */
export function updateClothSway(uniforms: ClothSwayUniforms, azimuth: number, amount: number, time: number): void {
  // The camera orbits around y, so "along the orbit" is the tangent (cos, -sin).
  uniforms.uSway.value.set(Math.cos(azimuth) * amount, 0, -Math.sin(azimuth) * amount);
  uniforms.uTime.value = time;
}
