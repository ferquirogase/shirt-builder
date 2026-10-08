"use client";
import { useEffect, useRef, type ComponentRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  DEFAULT_CAMERA_HEIGHT,
  DEFAULT_CAMERA_RADIUS,
  VIEW_AZIMUTH,
  azimuthOf,
  offsetAt,
  shortestDelta,
  stepAzimuth,
  stepToward,
  type ViewSide,
} from "@/lib/builder/geometry/camera-math";

type Props = {
  view: ViewSide;
  // Bumped on every explicit view request so choosing the same side again
  // (e.g. "restablecer vista" after dragging) re-triggers the animation.
  viewToken: number;
  // When true the animation also eases zoom and tilt back to the default pose
  // (the "restablecer vista" button), not just the left/right angle.
  resetPose: boolean;
  onInteract: () => void;
};

export function CameraRig({ view, viewToken, resetPose, onInteract }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const animating = useRef(false);

  useEffect(() => {
    animating.current = true;
  }, [view, viewToken, resetPose]);

  useFrame(({ camera }) => {
    const ctl = controls.current;
    if (!ctl || !animating.current) return;

    const target = ctl.target;
    const dx = camera.position.x - target.x;
    const dz = camera.position.z - target.z;
    const radius = Math.hypot(dx, dz);
    const height = camera.position.y - target.y;
    const goal = VIEW_AZIMUTH[view];

    const nextAzimuth = stepAzimuth(azimuthOf(dx, dz), goal, 0.12);
    const nextRadius = resetPose ? stepToward(radius, DEFAULT_CAMERA_RADIUS, 0.12) : radius;
    const nextHeight = resetPose ? stepToward(height, DEFAULT_CAMERA_HEIGHT, 0.12) : height;
    const offset = offsetAt(nextRadius, nextAzimuth);
    camera.position.set(target.x + offset.x, target.y + nextHeight, target.z + offset.z);
    ctl.update();

    const settled =
      Math.abs(shortestDelta(nextAzimuth, goal)) < 1e-6 &&
      (!resetPose || (nextRadius === DEFAULT_CAMERA_RADIUS && nextHeight === DEFAULT_CAMERA_HEIGHT));
    if (settled) animating.current = false;
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
