import { DEFAULT_CAMERA_HEIGHT, DEFAULT_CAMERA_RADIUS } from "./camera-math";
import { JERSEY_BOTTOM_Y, JERSEY_CENTER_Y, JERSEY_TOP_Y } from "./jersey-model";
import { SHORTS_BOTTOM_Y } from "./shorts-model";

// OBJ units to scene units (the model groups are scaled by this).
const UNIT = 0.01;
// The floor shadow sits a hair above the lowest point (as it does for the shirt alone).
const SHIRT_ONLY_FLOOR_Y = -0.6;
const FLOOR_GAP = SHIRT_ONLY_FLOOR_Y - (JERSEY_BOTTOM_Y - JERSEY_CENTER_Y) * UNIT;
const SHIRT_ONLY_SHADOW_FAR = 1.6;
// How much of the zoom a taller set is given back: 1 would fill the stage as
// much as the shirt alone, but the kit is over twice as tall and would not fit.
// Tune from screenshots.
const SET_ZOOM_MARGIN = 0.8;

export type Framing = {
  /** How far the garments are raised so the set is centred on the origin. */
  lift: number;
  floorY: number;
  /** How far above the floor the contact shadow looks. */
  shadowFar: number;
  cameraRadius: number;
  cameraHeight: number;
};

const SHIRT_ONLY: Framing = {
  lift: 0,
  floorY: SHIRT_ONLY_FLOOR_Y,
  shadowFar: SHIRT_ONLY_SHADOW_FAR,
  cameraRadius: DEFAULT_CAMERA_RADIUS,
  cameraHeight: DEFAULT_CAMERA_HEIGHT,
};

// The shirt alone is centred on the scene origin. The kit reaches much lower,
// so it is raised to centre it, the floor drops to its feet and the camera pulls
// back to keep the same tilt.
function kitFraming(): Framing {
  const shirtHeight = (JERSEY_TOP_Y - JERSEY_BOTTOM_Y) * UNIT;
  const kitHeight = (JERSEY_TOP_Y - SHORTS_BOTTOM_Y) * UNIT;
  const kitCenterY = (JERSEY_TOP_Y + SHORTS_BOTTOM_Y) / 2;
  const lift = (JERSEY_CENTER_Y - kitCenterY) * UNIT;
  const cameraRadius = DEFAULT_CAMERA_RADIUS * (kitHeight / shirtHeight) * SET_ZOOM_MARGIN;
  return {
    lift,
    floorY: (SHORTS_BOTTOM_Y - JERSEY_CENTER_Y) * UNIT + lift + FLOOR_GAP,
    shadowFar: SHIRT_ONLY_SHADOW_FAR + kitHeight - shirtHeight,
    cameraRadius,
    cameraHeight: (cameraRadius * DEFAULT_CAMERA_HEIGHT) / DEFAULT_CAMERA_RADIUS,
  };
}

const KIT = kitFraming();

export function framingFor(includeShorts: boolean): Framing {
  return includeShorts ? KIT : SHIRT_ONLY;
}
