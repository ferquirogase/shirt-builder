import { loadImage } from "./image-loader";
import { SPONSOR_SLOTS, type SponsorMap, type SponsorSlotId } from "./sponsor-slots";

export type SponsorImages = Partial<Record<SponsorSlotId, HTMLImageElement>>;
// Keyed by data URL: the pending promise is cached, so two placements that
// share an image (or two calls in a row) decode it once.
export type SponsorImageCache = Map<string, Promise<HTMLImageElement>>;

export async function loadSponsorImages(
  sponsors: SponsorMap,
  cache: SponsorImageCache,
  load: (src: string) => Promise<HTMLImageElement> = loadImage
): Promise<SponsorImages> {
  const decode = (src: string) => {
    let pending = cache.get(src);
    if (!pending) {
      pending = load(src);
      cache.set(src, pending);
      // A failure must not stay cached, or the image could never be retried.
      pending.catch(() => cache.delete(src));
    }
    return pending;
  };

  const loaded = await Promise.all(
    SPONSOR_SLOTS.map(async ({ id }) => {
      const entry = sponsors[id];
      if (!entry) return null;
      try {
        return [id, await decode(entry.dataUrl)] as const;
      } catch (err) {
        console.error(`Failed to load the ${id} sponsor image`, err);
        return null;
      }
    })
  );

  const images: SponsorImages = {};
  for (const item of loaded) {
    if (item) images[item[0]] = item[1];
  }
  return images;
}
