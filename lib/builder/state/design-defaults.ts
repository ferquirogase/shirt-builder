import { findPattern } from "../catalog/patterns";
import { findShortsPattern } from "../catalog/shorts-patterns";
import { initialDesignState, type DesignState } from "./design-state";

// A design saved by an older version of the builder (with an order, or as a draft) may lack fields that
// came later, or name things that are gone. These fill it in so it looks as it did and draws.

// A design saved before the moldes: it may lack the cuff and the fourth color, and may carry the
// separate sleeve color that the sleeves no longer have.
export function withColorDefaults(colors: DesignState["colors"]): DesignState["colors"] {
  const { primary, secondary, accent, quaternary, collar, sleeveTrim } = colors;
  return {
    primary,
    secondary,
    accent,
    quaternary: quaternary ?? initialDesignState.colors.quaternary,
    collar,
    sleeveTrim: sleeveTrim ?? secondary,
  };
}

// The shorts as saved. Before they had a design of their own they wore one of the shirt's colors
// (`colorSource`): that becomes their main color, so they look as they did.
function withShortsDesign(design: Partial<DesignState>): DesignState["shorts"] {
  const saved: Partial<DesignState["shorts"]> & { colorSource?: "primary" | "secondary" } = design.shorts ?? {};
  const defaults = initialDesignState.shorts;
  const colors = { ...defaults.colors, ...saved.colors };
  if (!saved.colors && saved.colorSource && design.colors?.[saved.colorSource]) colors.primary = design.colors[saved.colorSource];
  return {
    included: saved.included ?? defaults.included,
    patternId: saved.patternId && findShortsPattern(saved.patternId) ? saved.patternId : defaults.patternId,
    colors,
  };
}

// A torso pattern that has since been taken out of the catalog would draw nothing: the default one instead.
const knownPattern = (id: string | undefined) => (id && findPattern(id) ? id : initialDesignState.bodyPatternId);

export function withDesignDefaults(design: Partial<DesignState>): DesignState {
  const keeper = design.keeper ?? initialDesignState.keeper;
  return {
    ...initialDesignState,
    ...design,
    bodyPatternId: knownPattern(design.bodyPatternId),
    colors: withColorDefaults(design.colors ?? initialDesignState.colors),
    // The text style field by field: an older one lacks the border's color.
    nameNumberStyle: { ...initialDesignState.nameNumberStyle, ...design.nameNumberStyle },
    keeper: keeper.look
      ? { ...keeper, look: { ...keeper.look, bodyPatternId: knownPattern(keeper.look.bodyPatternId), colors: withColorDefaults(keeper.look.colors) } }
      : keeper,
    shorts: withShortsDesign(design),
  };
}
