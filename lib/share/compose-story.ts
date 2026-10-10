import { loadImage } from "@/lib/builder/texture/image-loader";
import { resolveFontFamily } from "@/lib/builder/texture/resolve-font-family";
import { coverCrop, fitInside, type Rect } from "./geometry";
import {
  BACKGROUND_SRC,
  BACK_RECT,
  CTA,
  FRONT_RECT,
  HALO,
  LOGO,
  LOGO_SRC,
  PHRASE,
  SHARE_URL,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "./story-layout";

export type ShirtViews = { front: HTMLCanvasElement; back: HTMLCanvasElement };
export type StoryAssets = { background: HTMLImageElement; logo: HTMLImageElement };
// CSS font-family lists, already resolved from the next/font variables.
export type StoryFonts = { display: string; body: string };

function sizeOf(source: HTMLImageElement | HTMLCanvasElement): { w: number; h: number } {
  return "naturalWidth" in source
    ? { w: source.naturalWidth, h: source.naturalHeight }
    : { w: source.width, h: source.height };
}

function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The phrase in capitals, on at most PHRASE.maxLines lines, at the biggest font
// size (down to PHRASE.minSize) at which every line fits PHRASE.maxWidth. A
// phrase that never fits is returned at the smallest size, as it is.
export function layoutPhrase(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string
): { size: number; lines: string[] } {
  const upper = text.toLocaleUpperCase("es");
  let best = { size: PHRASE.minSize, lines: [upper] };
  for (let size = PHRASE.maxSize; size >= PHRASE.minSize; size -= 2) {
    ctx.font = `${PHRASE.weight} ${size}px ${fontFamily}`;
    const lines = wrapWords(ctx, upper, PHRASE.maxWidth);
    best = { size, lines };
    if (lines.length <= PHRASE.maxLines && lines.every((line) => ctx.measureText(line).width <= PHRASE.maxWidth)) {
      return best;
    }
  }
  return best;
}

function drawHalo(ctx: CanvasRenderingContext2D, box: Rect): void {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const radius = HALO.radius * box.w;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, HALO.inner);
  glow.addColorStop(1, HALO.outer);
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function drawShirt(ctx: CanvasRenderingContext2D, shirt: HTMLCanvasElement, box: Rect): void {
  const fit = fitInside(shirt.width, shirt.height, box);
  ctx.drawImage(shirt, fit.x, fit.y, fit.w, fit.h);
}

// Everything is drawn in a fixed order: background, logo, phrase, the glow
// behind each shirt, the shirts (back over front) and the call to action.
export function drawStory(
  ctx: CanvasRenderingContext2D,
  { background, logo }: StoryAssets,
  { front, back }: ShirtViews,
  phrase: string,
  fonts: StoryFonts
): void {
  const bg = sizeOf(background);
  const crop = coverCrop(bg.w, bg.h, STORY_WIDTH, STORY_HEIGHT);
  ctx.drawImage(background, crop.x, crop.y, crop.w, crop.h, 0, 0, STORY_WIDTH, STORY_HEIGHT);

  const logoSize = sizeOf(logo);
  ctx.drawImage(logo, (STORY_WIDTH - LOGO.width) / 2, LOGO.y, LOGO.width, (LOGO.width * logoSize.h) / logoSize.w);

  const layout = layoutPhrase(ctx, phrase, fonts.display);
  ctx.save();
  ctx.font = `${PHRASE.weight} ${layout.size}px ${fonts.display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = PHRASE.color;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;
  layout.lines.forEach((line, i) => {
    ctx.fillText(line, STORY_WIDTH / 2, PHRASE.y + i * layout.size * PHRASE.lineHeight);
  });
  ctx.restore();

  drawHalo(ctx, FRONT_RECT);
  drawHalo(ctx, BACK_RECT);
  drawShirt(ctx, front, FRONT_RECT);
  drawShirt(ctx, back, BACK_RECT);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `${CTA.labelWeight} ${CTA.labelSize}px ${fonts.body}`;
  ctx.fillStyle = CTA.labelColor;
  ctx.fillText(CTA.label, STORY_WIDTH / 2, CTA.labelY);
  ctx.font = `${CTA.urlWeight} ${CTA.urlSize}px ${fonts.body}`;
  ctx.fillStyle = CTA.urlColor;
  ctx.fillText(SHARE_URL, STORY_WIDTH / 2, CTA.urlY);
  ctx.restore();
}

export type RenderDeps = {
  loadAssets: () => Promise<StoryAssets>;
  loadFonts: () => Promise<StoryFonts>;
  createCanvas: () => HTMLCanvasElement;
};

// The two assets are fetched once and reused by every "Otra frase".
let assetsPromise: Promise<StoryAssets> | null = null;
function cachedAssets(): Promise<StoryAssets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadImage(BACKGROUND_SRC), loadImage(LOGO_SRC)])
      .then(([background, logo]) => ({ background, logo }))
      .catch((error) => {
        assetsPromise = null;
        throw error;
      });
  }
  return assetsPromise;
}

// The fonts load on demand (next/font, preload: false): ask for them before
// drawing, or the canvas would use the fallback font.
async function loadStoryFonts(): Promise<StoryFonts> {
  const display = resolveFontFamily("--font-nn-oswald");
  const body = resolveFontFamily("--font-nn-montserrat");
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.all([
      document.fonts.load(`${PHRASE.weight} ${PHRASE.maxSize}px ${display}`),
      document.fonts.load(`${CTA.labelWeight} ${CTA.labelSize}px ${body}`),
      document.fonts.load(`${CTA.urlWeight} ${CTA.urlSize}px ${body}`),
    ]).catch(() => undefined);
  }
  return { display, body };
}

const defaultDeps: RenderDeps = {
  loadAssets: cachedAssets,
  loadFonts: loadStoryFonts,
  createCanvas: () => document.createElement("canvas"),
};

export async function renderStory(
  views: ShirtViews,
  phrase: string,
  deps: RenderDeps = defaultDeps
): Promise<Blob> {
  const [assets, fonts] = await Promise.all([deps.loadAssets(), deps.loadFonts()]);
  const canvas = deps.createCanvas();
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context to compose the story");
  drawStory(ctx, assets, views, phrase, fonts);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))), "image/png");
  });
}
