"use client";
import { useEffect, useRef, type ComponentRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { VIEW_AZIMUTH, azimuthOf, offsetAt, shortestDelta, stepAzimuth, type ViewSide } from "@/lib/builder/camera-math";

type Props = {
  view: ViewSide;
  // Bumped on every explicit view request so choosing the same side again
  // (e.g. "restablecer vista" after dragging) re-triggers the animation.
  viewToken: number;
  onInteract: () => void;
};

export function CameraRig({ view, viewToken, onInteract }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const animating = useRef(false);

  useEffect(() => {
    animating.current = true;
  }, [view, viewToken]);

  useFrame(({ camera }) => {
    const ctl = controls.current;
    if (!ctl || !animating.current) return;

    const target = ctl.target;
    const dx = camera.position.x - target.x;
    const dz = camera.position.z - target.z;
    const radius = Math.hypot(dx, dz);
    const goal = VIEW_AZIMUTH[view];

    const next = stepAzimuth(azimuthOf(dx, dz), goal, 0.12);
    const offset = offsetAt(radius, next);
    camera.position.x = target.x + offset.x;
    camera.position.z = target.z + offset.z;
    ctl.update();

    if (Math.abs(shortestDelta(next, goal)) < 1e-6) animating.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={1}
      maxDistance={6}
      onStart={() => {
        animating.current = false;
        onInteract();
      }}
    />
  );
}
