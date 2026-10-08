import * as THREE from "three";

// The OBJ loader returns a group; the jersey is the first mesh inside it.
export function firstMeshGeometry(object: THREE.Object3D | null | undefined): THREE.BufferGeometry | null {
  let found: THREE.BufferGeometry | null = null;
  object?.traverse((child) => {
    if (!found && child instanceof THREE.Mesh) found = child.geometry;
  });
  return found;
}

export type JerseyGeometry = {
  /** A copy of the body, so the cached OBJ is never touched. */
  body: THREE.BufferGeometry | null;
  /** The collar mesh that ships with the model, in the same coordinates as the body. */
  collar: THREE.BufferGeometry | null;
  /** Middle of the body's vertical extent, used to re-centre the shirt on the scene origin. */
  centerY: number;
};

export function prepareJerseyGeometry(
  bodyObject: THREE.Object3D,
  collarObject: THREE.Object3D | null | undefined
): JerseyGeometry {
  const source = firstMeshGeometry(bodyObject);
  const body = source ? source.clone() : null;
  let centerY = 0;
  if (body) {
    body.computeBoundingBox();
    const box = body.boundingBox!;
    centerY = (box.min.y + box.max.y) / 2;
  }
  return { body, collar: firstMeshGeometry(collarObject), centerY };
}
