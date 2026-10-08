"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { DirectionalLight } from "three";
import { KEY_LIGHT_INTENSITY, KEY_LIGHT_POSITION, keyLightPositionFor } from "./lighting";

// The key light, kept in the same place relative to the camera: whichever side
// of the shirt is in view (front, back, a sleeve) is lit the same way.
export function CameraKeyLight() {
  const light = useRef<DirectionalLight>(null);
  useFrame(({ camera }) => {
    const [x, y, z] = keyLightPositionFor(camera.position.x, camera.position.z);
    light.current?.position.set(x, y, z);
  });
  return <directionalLight ref={light} position={KEY_LIGHT_POSITION} intensity={KEY_LIGHT_INTENSITY} />;
}
