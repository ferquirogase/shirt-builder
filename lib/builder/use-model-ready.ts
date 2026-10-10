"use client";
import { useProgress } from "@react-three/drei";

// True once everything the 3D viewer started loading (the models and their maps) has arrived.
// Before the viewer asks for anything there is nothing loading yet, and that is not "ready".
export function useModelReady(): boolean {
  const { active, total } = useProgress();
  return total > 0 && !active;
}
