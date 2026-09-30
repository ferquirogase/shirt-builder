"use client";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

export function JerseyModel() {
  const obj = useLoader(OBJLoader, "/models/jersey_ss.obj");
  // The OBJ's vertex coordinates are in the hundreds (bounding box measured
  // as roughly x:[-68.5, 68.5], y:[161.8, 298.1], z:[-29.8, 27.8]), so
  // scale=0.01 brings the model to a ~1.37m x 1.36m x 0.58m box, a
  // reasonable size for the camera/OrbitControls setup in Viewer3D.
  // The mesh's vertical center in OBJ space is at y ~= 230, i.e. y ~= 2.3
  // after scaling, so a position offset is applied to bring it back to the
  // scene origin (where the camera and OrbitControls target are aimed).
  return <primitive object={obj} scale={0.01} position={[0, -2.3, 0]} />;
}
