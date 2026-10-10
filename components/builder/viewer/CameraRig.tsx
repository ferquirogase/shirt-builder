"use client";
import { useEffect, useRef, type ComponentRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
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
  // The pose "restablecer vista" goes back to. It changes when the garment
  // changes size (a kit is taller than a shirt), and the camera follows.
  defaultRadius: number;
  defaultHeight: number;
  onInteract: () => void;
};

export function CameraRig({ view, viewToken, resetPose, defaultRadius, defaultHeight, onInteract }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const animating = useRef(false);
  // The default pose moved: ease zoom and tilt to it even without a reset.
  const refit = useRef(false);

  useEffect(() => {
    animating.current = true;
  }, [view, viewToken, resetPose]);

  useEffect(() => {
    animating.current = true;
    refit.current = true;
  }, [defaultRadius, defaultHeight]);

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
    const easePose = resetPose || refit.current;
    const nextRadius = easePose ? stepToward(radius, defaultRadius, 0.12) : radius;
    const nextHeight = easePose ? stepToward(height, defaultHeight, 0.12) : height;
    const offset = offsetAt(nextRadius, nextAzimuth);
    camera.position.set(target.x + offset.x, target.y + nextHeight, target.z + offset.z);
    ctl.update();

    const settled =
      Math.abs(shortestDelta(nextAzimuth, goal)) < 1e-6 &&
      (!easePose || (nextRadius === defaultRadius && nextHeight === defaultHeight));
    if (settled) {
      animating.current = false;
      refit.current = false;
    }
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
        refit.current = false;
        onInteract();
      }}
    />
  );
}
