"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadImage } from "../texture/image-loader";
import { readAsDataUrl, validateLogoFile } from "./logo-upload";

// Shared by the crest and each sponsor placement: validates the file, reads it,
// and checks the browser can really draw it before calling `onLoaded`. Only the
// latest upload may call back, even if an older one finishes decoding later.
export function useImageUpload(onLoaded: (dataUrl: string) => void) {
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const request = ++latestRequest.current;
    try {
      const dataUrl = await readAsDataUrl(file);
      // The type check can pass for a renamed/corrupt file: make sure the
      // browser can actually draw it before it enters the design (and history).
      await loadImage(dataUrl);
      if (request !== latestRequest.current) return;
      onLoadedRef.current(dataUrl);
    } catch (err) {
      console.error("Failed to load image", err);
      if (request === latestRequest.current) setError("No se pudo leer la imagen.");
    }
  }, []);

  // Invalidates any upload still in flight (used when the image is removed).
  const cancelPending = useCallback(() => {
    latestRequest.current++;
  }, []);

  return { error, handleFile, cancelPending };
}
