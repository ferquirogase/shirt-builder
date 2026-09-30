"use client";
import { DesignProvider } from "@/lib/builder/design-context";
import { Viewer3D } from "./Viewer3D";
import { ControlPanel } from "./ControlPanel";

export function BuilderPage() {
  return (
    <DesignProvider>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Viewer3D />
        </div>
        <div className="w-full md:w-80">
          <ControlPanel />
        </div>
      </div>
    </DesignProvider>
  );
}
