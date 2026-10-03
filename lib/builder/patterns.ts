export type PatternDef = {
  id: string;
  label: string;
  svgPath: string;
};

export const BODY_PATTERNS: PatternDef[] = [
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg" },
  { id: "stripes-v1", label: "Franjas", svgPath: "/patterns/stripes-v1-body.svg" },
  { id: "diagonal", label: "Diagonal", svgPath: "/patterns/diagonal-body.svg" },
  { id: "gradient", label: "Degradado", svgPath: "/patterns/gradient-body.svg" },
  { id: "geometric", label: "Geométrico", svgPath: "/patterns/geometric-body.svg" },
  { id: "hoops", label: "Rayas", svgPath: "/patterns/hoops-body.svg" },
];

export const SLEEVE_PATTERNS: PatternDef[] = [
  { id: "sleeve-plain", label: "Color secundario", svgPath: "/patterns/sleeve-plain.svg" },
  { id: "sleeve-primary", label: "Color primario", svgPath: "/patterns/sleeve-primary.svg" },
  { id: "sleeve-cuff", label: "Con puño", svgPath: "/patterns/sleeve-cuff.svg" },
];
