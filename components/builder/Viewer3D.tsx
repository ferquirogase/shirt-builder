"use client";
import { Suspense, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { ViewSide } from "@/lib/builder/camera-math";
import { CameraRig } from "./CameraRig";
import { JerseyModel } from "./JerseyModel";

type Props = { view: ViewSide; viewToken: number; onInteract: () => void };

// The jersey mesh spans y in about [-0.68, 0.68] (see JerseyModel), so the
// "floor" shadow sits just under it. The canvas is transparent: the stage
// gradient is CSS behind it, and the exported PNG paints the same gradient.
const FLOOR_Y = -0.69;

export const Viewer3D = forwardRef<HTMLCanvasElement, Props>(function Viewer3D(
  { view, viewToken, onInteract },
  ref
) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 3], fov: 45 }}
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      style={{ background: "transparent" }}
      ref={ref}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 3]} intensity={1} />
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
      <CameraRig view={view} viewToken={viewToken} onInteract={onInteract} />
    </Canvas>
  );
});
