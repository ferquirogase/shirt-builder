import * as THREE from "three";
import { SWAY_ATTRIBUTE } from "@/lib/builder/geometry/cloth-sway";
import {
  COLLIDER_BINS,
  COLLIDER_MARGIN,
  COLLIDER_SAMPLES,
  type ShortsCollider,
} from "@/lib/builder/geometry/shorts-collider";

// Amplitude (OBJ units) and speed of the small ripple that keeps the cloth
// alive even when the camera is still.
const RIPPLE_AMPLITUDE = 0.5;
const RIPPLE_SPEED = 1.6;

// The collider's radii are packed four to a vec4 (see setClothCollider).
const RADII_VECTORS = (COLLIDER_SAMPLES * COLLIDER_BINS) / 4;

export type ClothSwayUniforms = {
  /** Horizontal direction the cloth is pushed in, already scaled by the sway amount. */
  uSway: { value: THREE.Vector3 };
  uTime: { value: number };
  /** Lowest and highest height the shorts' collider covers, and 1 when it is switched on. */
  uColliderRange: { value: THREE.Vector3 };
  /** Centre (x, z) of the shorts' cross-section at each height. */
  uColliderCenter: { value: THREE.Vector2[] };
  /** The shorts' radius in each direction at each height, four to a vec4. */
  uColliderRadii: { value: THREE.Vector4[] };
};

export function createClothSwayUniforms(): ClothSwayUniforms {
  return {
    uSway: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uColliderRange: { value: new THREE.Vector3() },
    uColliderCenter: { value: Array.from({ length: COLLIDER_SAMPLES }, () => new THREE.Vector2()) },
    uColliderRadii: { value: Array.from({ length: RADII_VECTORS }, () => new THREE.Vector4()) },
  };
}

// The same maths as pushOutside in shorts-collider.ts: a vertex that the sway
// moved inside the shorts goes back out to their surface plus a margin.
const COLLIDER_GLSL = `
uniform vec3 uColliderRange;
uniform vec2 uColliderCenter[${COLLIDER_SAMPLES}];
uniform vec4 uColliderRadii[${RADII_VECTORS}];
float colliderRadius(int sampleIndex, int bin) {
  int index = sampleIndex * ${COLLIDER_BINS} + bin;
  return uColliderRadii[index / 4][index - (index / 4) * 4];
}`;

const COLLIDE_GLSL = `
if (uColliderRange.z > 0.5 && transformed.y >= uColliderRange.x && transformed.y <= uColliderRange.y) {
  float cf = (transformed.y - uColliderRange.x) / (uColliderRange.y - uColliderRange.x) * float(${COLLIDER_SAMPLES - 1});
  int ci = int(min(floor(cf), float(${COLLIDER_SAMPLES - 2})));
  float ct = cf - float(ci);
  vec2 cc = mix(uColliderCenter[ci], uColliderCenter[ci + 1], ct);
  vec2 cd = transformed.xz - cc;
  float cdist = length(cd);
  float cu = (atan(cd.y, cd.x) + 3.14159265) / (6.28318531 / float(${COLLIDER_BINS}));
  int k0 = int(floor(cu)) % ${COLLIDER_BINS};
  int k1 = (k0 + 1) % ${COLLIDER_BINS};
  float fk = cu - floor(cu);
  float rLo = mix(colliderRadius(ci, k0), colliderRadius(ci, k1), fk);
  float rHi = mix(colliderRadius(ci + 1, k0), colliderRadius(ci + 1, k1), fk);
  float cr = mix(rLo, rHi, ct) + ${COLLIDER_MARGIN.toFixed(2)};
  if (cdist < cr) {
    vec2 dir = cdist > 0.0001 ? cd / cdist : vec2(0.0, 1.0);
    transformed.xz = cc + dir * cr;
  }
}`;

/**
 * Makes `material` displace its vertices by their `swayWeight`, and (unless `collide`
 * is false, for the shorts themselves) keep out of the shorts' collider. Safe to call
 * once per material.
 */
export function applyClothSway(
  material: THREE.Material,
  uniforms: ClothSwayUniforms,
  { collide = true }: { collide?: boolean } = {}
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSway = uniforms.uSway;
    shader.uniforms.uTime = uniforms.uTime;
    if (collide) {
      shader.uniforms.uColliderRange = uniforms.uColliderRange;
      shader.uniforms.uColliderCenter = uniforms.uColliderCenter;
      shader.uniforms.uColliderRadii = uniforms.uColliderRadii;
    }
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float ${SWAY_ATTRIBUTE};
uniform vec3 uSway;
uniform float uTime;${collide ? COLLIDER_GLSL : ""}`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float swayW = ${SWAY_ATTRIBUTE};
// Squared so the part near the body barely moves and the free edge swings most.
transformed += uSway * (swayW * swayW);
transformed += normal * sin(position.y * 0.12 + position.x * 0.09 + uTime * ${RIPPLE_SPEED.toFixed(2)}) * ${RIPPLE_AMPLITUDE.toFixed(2)} * swayW;${collide ? COLLIDE_GLSL : ""}`
      );
  };
  material.customProgramCacheKey = () => (collide ? "cloth-sway" : "cloth-sway-free");
  material.needsUpdate = true;
}

/** Hands the shorts' collider to the shaders (or switches it off with null). Fills the arrays in place. */
export function setClothCollider(uniforms: ClothSwayUniforms, collider: ShortsCollider | null): void {
  if (!collider) {
    uniforms.uColliderRange.value.z = 0;
    return;
  }
  collider.samples.forEach((sample, i) => {
    uniforms.uColliderCenter.value[i].set(sample.cx, sample.cz);
    sample.radii.forEach((radius, bin) => {
      const index = i * COLLIDER_BINS + bin;
      uniforms.uColliderRadii.value[index >> 2].setComponent(index & 3, radius);
    });
  });
  uniforms.uColliderRange.value.set(collider.yMin, collider.yMax, 1);
}

/** Per-frame update: pushes the cloth along the orbit tangent at `azimuth` by `amount`. */
export function updateClothSway(uniforms: ClothSwayUniforms, azimuth: number, amount: number, time: number): void {
  // The camera orbits around y, so "along the orbit" is the tangent (cos, -sin).
  uniforms.uSway.value.set(Math.cos(azimuth) * amount, 0, -Math.sin(azimuth) * amount);
  uniforms.uTime.value = time;
}
