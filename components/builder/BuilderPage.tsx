"use client";
import { useRef } from "react";
import { DesignProvider } from "@/lib/builder/design-context";
import { Viewer3D } from "./Viewer3D";
import { ControlPanel } from "./ControlPanel";

export function BuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "mi-camiseta.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <DesignProvider>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Viewer3D ref={canvasRef} />
          <button onClick={handleExport} className="mt-2 px-4 py-2 bg-green-700 text-white rounded">
            Exportar PNG
          </button>
        </div>
        <div className="w-full md:w-80">
          <ControlPanel />
        </div>
      </div>
    </DesignProvider>
  );
}
