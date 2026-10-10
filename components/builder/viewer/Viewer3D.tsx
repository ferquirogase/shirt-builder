"use client";
import { Suspense, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_RADIUS, type ViewSide } from "@/lib/builder/geometry/camera-math";
import { framingFor } from "@/lib/builder/geometry/set-framing";
import { useDesign } from "@/lib/builder/state/design-context";
import { CameraKeyLight } from "./CameraKeyLight";
import { CameraRig } from "./CameraRig";
import {
  AMBIENT_INTENSITY,
  TONE_MAPPING,
  TONE_MAPPING_EXPOSURE,
} from "./lighting";
import { JerseyModel } from "./JerseyModel";
import { ShortsModel } from "./ShortsModel";

type Props = { view: ViewSide; viewToken: number; resetPose: boolean; onInteract: () => void };

// The "floor" shadow sits just under the garment (framingFor gives its height and
// how far the set is raised; see JerseyModel for how the mesh is scaled and
// centred). The canvas is transparent: the stage gradient is CSS behind it, and
// the exported PNG paints the same gradient.

export const Viewer3D = forwardRef<HTMLCanvasElement, Props>(function Viewer3D(
  { view, viewToken, resetPose, onInteract },
  ref
) {
  const { state } = useDesign();
  const { lift, floorY } = framingFor(state.shorts.included);
  return (
    <Canvas
      camera={{ position: [0, DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_RADIUS], fov: 45 }}
      gl={{
        preserveDrawingBuffer: true,
        alpha: true,
        toneMapping: TONE_MAPPING,
        toneMappingExposure: TONE_MAPPING_EXPOSURE,
      }}
      style={{ background: "transparent" }}
      ref={ref}
    >
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <CameraKeyLight />
      <group position={[0, lift, 0]}>
        <Suspense fallback={null}>
          <JerseyModel />
        </Suspense>
        {state.shorts.included && <ShortsModel />}
      </group>
      <ContactShadows
        position={[0, floorY, 0]}
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
