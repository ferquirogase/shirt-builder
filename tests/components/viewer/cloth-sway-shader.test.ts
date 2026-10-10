import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { COLLIDER_BINS, COLLIDER_SAMPLES, type ShortsCollider } from "@/lib/builder/geometry/shorts-collider";
import {
  applyClothSway,
  createClothSwayUniforms,
  setClothCollider,
} from "@/components/builder/viewer/cloth-sway-shader";

// Each sample's centre is (i, -i) and its radius in direction k is 100 * i + k, so every packed value is distinct.
function labelledCollider(): ShortsCollider {
  return {
    yMin: 167,
    yMax: 205,
    samples: Array.from({ length: COLLIDER_SAMPLES }, (_, i) => ({
      cx: i,
      cz: -i,
      radii: Array.from({ length: COLLIDER_BINS }, (_, k) => 100 * i + k),
    })),
  };
}

describe("createClothSwayUniforms", () => {
  it("starts with the collider switched off", () => {
    const uniforms = createClothSwayUniforms();
    expect(uniforms.uColliderRange.value.z).toBe(0);
    expect(uniforms.uColliderCenter.value).toHaveLength(COLLIDER_SAMPLES);
    expect(uniforms.uColliderRadii.value).toHaveLength((COLLIDER_SAMPLES * COLLIDER_BINS) / 4);
  });
});

describe("setClothCollider", () => {
  it("packs the heights, the centres and the radii (four to a vec4) and switches it on", () => {
    const uniforms = createClothSwayUniforms();
    setClothCollider(uniforms, labelledCollider());
    expect(uniforms.uColliderRange.value.toArray()).toEqual([167, 205, 1]);
    expect(uniforms.uColliderCenter.value[5].toArray()).toEqual([5, -5]);
    for (const [i, k] of [[0, 0], [0, COLLIDER_BINS - 1], [3, 7], [COLLIDER_SAMPLES - 1, COLLIDER_BINS - 1], [5, 4]]) {
      const index = i * COLLIDER_BINS + k;
      expect(uniforms.uColliderRadii.value[Math.floor(index / 4)].getComponent(index % 4)).toBe(100 * i + k);
    }
  });

  it("switches it off with null, keeping the same uniform objects the shaders already hold", () => {
    const uniforms = createClothSwayUniforms();
    const radii = uniforms.uColliderRadii;
    setClothCollider(uniforms, labelledCollider());
    setClothCollider(uniforms, null);
    expect(uniforms.uColliderRange.value.z).toBe(0);
    expect(uniforms.uColliderRadii).toBe(radii);
  });
});

describe("applyClothSway", () => {
  function compile(options?: { collide?: boolean }) {
    const uniforms = createClothSwayUniforms();
    const material = new THREE.MeshStandardMaterial();
    applyClothSway(material, uniforms, options);
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: "#include <common>\n#include <begin_vertex>\n",
    };
    material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    return { shader, uniforms, material };
  }

  it("shares the sway and collider uniforms with the shader, not copies of them", () => {
    const { shader, uniforms } = compile();
    expect(shader.uniforms.uSway).toBe(uniforms.uSway);
    expect(shader.uniforms.uColliderRadii).toBe(uniforms.uColliderRadii);
    expect(shader.uniforms.uColliderRange).toBe(uniforms.uColliderRange);
    expect(shader.uniforms.uColliderCenter).toBe(uniforms.uColliderCenter);
  });

  it("leaves out the collider for the shorts, which must not push themselves", () => {
    const { shader, material } = compile({ collide: false });
    expect(shader.vertexShader).not.toContain("uColliderRadii");
    expect(shader.vertexShader).not.toContain("uColliderRange");
    // It still sways and ripples like the shirt.
    expect(shader.vertexShader).toContain("uSway *");
    expect(shader.uniforms.uSway).toBeDefined();
    // And does not share a compiled program with the shirt's.
    expect(material.customProgramCacheKey()).not.toBe(compile().material.customProgramCacheKey());
  });

  it("declares the collider and pushes the displaced vertex out of it", () => {
    const { shader } = compile();
    expect(shader.vertexShader).toContain(`uniform vec4 uColliderRadii[${(COLLIDER_SAMPLES * COLLIDER_BINS) / 4}]`);
    expect(shader.vertexShader).toContain("uColliderRange.z > 0.5");
    // The collision runs after the sway and the ripple have moved the vertex.
    expect(shader.vertexShader.indexOf("uSway *")).toBeLessThan(shader.vertexShader.indexOf("uColliderRange.z > 0.5"));
  });
});
