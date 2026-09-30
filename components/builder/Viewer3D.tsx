"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { JerseyModel } from "./JerseyModel";

export function Viewer3D() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1} />
        <Suspense fallback={null}>
          <JerseyModel />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1} maxDistance={6} />
      </Canvas>
    </div>
  );
}
