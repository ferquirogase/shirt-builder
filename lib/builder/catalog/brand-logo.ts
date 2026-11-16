// The maker's logo, in two versions that both carry an outline of the opposite
// color so they stay legible: the black one for light cloth, the white one for
// dark cloth. Both share the same crop so swapping them never shifts the logo.
export const BRAND_LOGO_URLS = {
  forLight: "/brand/gepe-logo-black.png",
  forDark: "/brand/gepe-logo-white.png",
} as const;

// The two labels on every shirt, as in the owners' moldes: the "Producto oficial" tag low on the front
// and the flag strip low on the back (where they go: UVRegions.frontLabel / backLabel). They keep their
// own colors whatever the shirt's.
export const BRAND_LABEL_URLS = {
  front: "/brand/label-front.svg",
  back: "/brand/label-back.svg",
} as const;
