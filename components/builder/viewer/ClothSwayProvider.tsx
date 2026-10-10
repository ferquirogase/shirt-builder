"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createClothSwayUniforms, type ClothSwayUniforms } from "./cloth-sway-shader";

const ClothSwayContext = createContext<ClothSwayUniforms | null>(null);

// The shirt's sway and the shorts' collider live in the same shader uniforms:
// the shirt writes the sway into them every frame, and the shorts hand over the
// collider the shirt must stay out of.
export function ClothSwayProvider({ children }: { children: ReactNode }) {
  const uniforms = useMemo(() => createClothSwayUniforms(), []);
  return <ClothSwayContext.Provider value={uniforms}>{children}</ClothSwayContext.Provider>;
}

export function useClothSway(): ClothSwayUniforms {
  const uniforms = useContext(ClothSwayContext);
  if (!uniforms) throw new Error("useClothSway must be used inside a ClothSwayProvider");
  return uniforms;
}
