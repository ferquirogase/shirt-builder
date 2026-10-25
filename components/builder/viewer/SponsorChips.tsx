"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { SPONSOR_SLOTS, sponsorNumber, type SponsorSlot } from "@/lib/builder/catalog/sponsor-slots";
import { isFacingCamera, sponsorAnchor, type SponsorAnchor } from "@/lib/builder/geometry/sponsor-anchor";
import type { UVRegions } from "@/lib/builder/geometry/uv-regions";
import { useDesign } from "@/lib/builder/state/design-context";
import { SponsorChip } from "./SponsorChip";

// How far a marker floats off the cloth, in the model's units (about 3 cm), so it never sinks into it.
const LIFT = 3;
// The sleeve's mark is on the outer face of the arm, which the front view sees edge-on. A marker
// still shows up to this far past edge-on (cosine of the angle), and goes once the cloth looks away.
const VISIBLE_MIN_COS = -0.5;

function ChipAnchor({ slot, anchor }: { slot: SponsorSlot; anchor: SponsorAnchor }) {
  const { state, selectedSponsor, pickSponsor } = useDesign();
  const group = useRef<THREE.Group>(null);
  const chip = useRef<HTMLDivElement>(null);
  const position = useMemo(() => anchor.position.clone().addScaledVector(anchor.normal, LIFT), [anchor]);

  // A marker on the far side of the shirt (the back, seen from the front) is hidden; the DOM is
  // touched directly because this runs every frame.
  useFrame(({ camera }) => {
    const g = group.current;
    const el = chip.current;
    if (!g || !el) return;
    const worldPosition = g.getWorldPosition(new THREE.Vector3());
    const worldNormal = anchor.normal.clone().transformDirection(g.matrixWorld);
    const facing = isFacingCamera(worldPosition, worldNormal, camera.position, VISIBLE_MIN_COS);
    el.style.visibility = facing ? "visible" : "hidden";
    el.style.pointerEvents = facing ? "auto" : "none";
  });

  return (
    <group ref={group} position={position}>
      <Html center zIndexRange={[10, 0]}>
        <div ref={chip}>
          <SponsorChip
            number={sponsorNumber(slot.id)}
            label={slot.label}
            image={state.sponsors[slot.id]?.dataUrl}
            selected={selectedSponsor === slot.id}
            onSelect={() => pickSponsor(slot.id)}
          />
        </div>
      </Html>
    </group>
  );
}

/** A marker on every sponsor placement of the shirt, while the Sponsor panel is open. */
export function SponsorChips({ geometry, regions }: { geometry: THREE.BufferGeometry | null; regions: UVRegions }) {
  const { sponsorMarkers } = useDesign();
  const anchors = useMemo(() => {
    if (!geometry) return [];
    return SPONSOR_SLOTS.flatMap((slot) => {
      const anchor = sponsorAnchor(geometry, regions, slot);
      return anchor ? [{ slot, anchor }] : [];
    });
  }, [geometry, regions]);

  if (!sponsorMarkers) return null;
  return (
    <>
      {anchors.map(({ slot, anchor }) => (
        <ChipAnchor key={slot.id} slot={slot} anchor={anchor} />
      ))}
    </>
  );
}
