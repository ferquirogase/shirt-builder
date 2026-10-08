// Vertical layout of the back of the jersey, as positions within bodyBack
// measured from the collar edge (0) toward the hem (1). Kept in one place
// because the name, the number and the back sponsors have to share the same
// strip without overlapping (see tests/lib/back-layout.test.ts).

// The collar mesh covers the back panel's texture down to here (u 0.41..0.59 on
// the GEPE model). The name's top edge reaches into it, as it always has.
export const COLLAR_BAND_END_V_FRAC = 0.23;

export const NAME_V_FRAC = 0.25; // baseline of the player name
export const NUMBER_V_FRAC = 0.55; // baseline of the number
// With the name this high there is no room above it, so the nape sponsor sits
// between the name and the number.
export const NAPE_V_FRAC = 0.31;
export const LOWER_BACK_V_FRAC = 0.88;

// Font sizes as a share of the canvas.
export const NAME_FONT_FRACTION = 0.05;
export const NUMBER_FONT_FRACTION = 0.12;
