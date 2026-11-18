// Vertical layout of the back of the jersey, as positions within bodyBack
// measured from the collar edge (0) toward the hem (1). Kept in one place
// because the name, the number and the back sponsors have to share the same
// strip without overlapping (see tests/lib/back-layout.test.ts).
//
// Calibrated against a screenshot of the back: the name's baseline (0.25) and the
// number's baseline (0.55) are about 700px apart per unit of vFrac, which puts the
// collar's lower edge at roughly 6.5% and the waist at roughly 75%.

// Where the visible collar ends at the back. (The collar mesh's UVs reach further
// down the texture than what shows on the shirt, so this is measured, not read
// from the mesh.)
export const COLLAR_BAND_END_V_FRAC = 0.065;

export const NAPE_V_FRAC = 0.1; // the maker’s logo, between the collar and the name
// GEPE’s sponsor 6 takes the name's place: centered on the name's letters (baseline 0.25, letters
// NAME_FONT_FRACTION x 0.72 tall), so it is not offered while there is a name.
export const UPPER_BACK_V_FRAC = 0.21;
export const NAME_V_FRAC = 0.25; // baseline of the player name
export const NUMBER_V_FRAC = 0.53; // baseline of the number, raised from 0.55 to make room for sponsor 7
export const LOWER_BACK_V_FRAC = 0.64; // GEPE’s sponsor 7, under the number, above the label on the hem

// Font sizes as a share of the canvas.
export const NAME_FONT_FRACTION = 0.05;
export const NUMBER_FONT_FRACTION = 0.135;
