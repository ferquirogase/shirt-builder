"use client";
import { Suspense, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_RADIUS, type ViewSide } from "@/lib/builder/camera-math";
import { CameraRig } from "./CameraRig";
import { JerseyModel } from "./JerseyModel";

type Props = { view: ViewSide; viewToken: number; resetPose: boolean; onInteract: () => void };

// The reshaped jersey mesh spans y in about [-0.59, 0.59] (see JerseyModel and
// garment-shape), so the
// "floor" shadow sits just under it. The canvas is transparent: the stage
// gradient is CSS behind it, and the exported PNG paints the same gradient.
const FLOOR_Y = -0.6;

export const Viewer3D = forwardRef<HTMLCanvasElement, Props>(function Viewer3D(
  { view, viewToken, resetPose, onInteract },
  ref
) {
  return (
    <Canvas
      camera={{ position: [0, DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_RADIUS], fov: 45 }}
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      style={{ background: "transparent" }}
      ref={ref}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[2, 4, 3]} intensity={2.2} />
      <Suspense fallback={null}>
        <JerseyModel />
      </Suspense>
      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={0.35}
        scale={6}
        blur={3}
        far={1.6}
        resolution={512}
        color="#6b5a2e"
      />
      <CameraRig view={view} viewToken={viewToken} resetPose={resetPose} onInteract={onInteract} />
    </Canvas>
  );
});
