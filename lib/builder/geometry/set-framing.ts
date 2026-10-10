// The shirt alone is centred on the scene origin. With shorts the set is taller
// and its middle sits lower, so everything is raised and the floor shadow drops.
// Tune these two numbers from screenshots.
const SHIRT_ONLY = { lift: 0, floorY: -0.6 };
const WITH_SHORTS = { lift: 0.4, floorY: -1.1 };

export function framingFor(includeShorts: boolean): { lift: number; floorY: number } {
  return includeShorts ? WITH_SHORTS : SHIRT_ONLY;
}
