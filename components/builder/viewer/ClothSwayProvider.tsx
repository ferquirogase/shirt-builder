"use client";
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { azimuthOf, shortestDelta } from "@/lib/builder/geometry/camera-math";
import { stepSpring, swayTarget, type SpringState } from "@/lib/builder/geometry/cloth-sway";
import { createClothSwayUniforms, updateClothSway, type ClothSwayUniforms } from "./cloth-sway-shader";

const ClothSwayContext = createContext<ClothSwayUniforms | null>(null);

// One spring for the whole kit: the shirt and the shorts read the same sway, so
// the shirt's hem and the shorts' waist move together and never cut through
// each other. The sway lags behind the camera's orbit (see cloth-sway.ts).
export function ClothSwayProvider({ children }: { children: ReactNode }) {
  const uniforms = useMemo(() => createClothSwayUniforms(), []);
  const spring = useRef<SpringState>({ value: 0, velocity: 0 });
  const lastAzimuth = useRef<number | null>(null);

  useFrame(({ camera, clock }, delta) => {
    const azimuth = azimuthOf(camera.position.x, camera.position.z);
    const previous = lastAzimuth.current ?? azimuth;
    lastAzimuth.current = azimuth;
    const orbitSpeed = delta > 0 ? shortestDelta(previous, azimuth) / delta : 0;
    spring.current = stepSpring(spring.current, swayTarget(orbitSpeed), delta);
    updateClothSway(uniforms, azimuth, spring.current.value, clock.elapsedTime);
  });

  return <ClothSwayContext.Provider value={uniforms}>{children}</ClothSwayContext.Provider>;
}

export function useClothSway(): ClothSwayUniforms {
  const uniforms = useContext(ClothSwayContext);
  if (!uniforms) throw new Error("useClothSway must be used inside a ClothSwayProvider");
  return uniforms;
}
