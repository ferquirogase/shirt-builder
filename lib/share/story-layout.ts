import type { Rect } from "./geometry";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export const BACKGROUND_SRC = "/share/story-background.png";
export const LOGO_SRC = "/brand/gepe-logo-white.png";

// Address printed under "Diseñá la tuya en". Provisional: replace with the real one.
export const SHARE_URL = "gepesport.com";

// Instagram covers about 250 px at the top and the bottom with its own UI, so
// text and logo stay between y = 270 and y = 1670.
export const LOGO = { width: 220, y: 270 };

export const PHRASE = {
  y: 450, // top of the first line
  maxWidth: 860,
  maxLines: 2,
  maxSize: 72,
  minSize: 40,
  lineHeight: 1.05,
  weight: 700,
  color: "#f5b400",
};

// The two shirts are staggered on a diagonal: front up-left, back down-right.
export const FRONT_RECT: Rect = { x: 60, y: 640, w: 560, h: 520 };
export const BACK_RECT: Rect = { x: 460, y: 1000, w: 560, h: 520 };

// Soft glow behind each shirt so dark shirts read against the black background.
export const HALO = {
  radius: 0.62, // fraction of the shirt box width
  inner: "rgba(255,232,160,0.22)",
  outer: "rgba(255,232,160,0)",
};

export const CTA = {
  label: "Diseñá la tuya en",
  labelY: 1590, // top of the text
  labelSize: 36,
  labelWeight: 600,
  labelColor: "rgba(255,255,255,0.85)",
  urlY: 1650,
  urlSize: 54,
  urlWeight: 800,
  urlColor: "#f5b400",
};
