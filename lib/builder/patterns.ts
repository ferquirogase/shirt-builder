export type PatternDef = {
  id: string;
  label: string;
  svgPath: string;
};

export const BODY_PATTERNS: PatternDef[] = [
  { id: "stripes-v1", label: "Rayas verticales", svgPath: "/patterns/stripes-v1-body.svg" },
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg" },
];

export const SLEEVE_PATTERNS: PatternDef[] = [
  { id: "sleeve-plain", label: "Manga lisa", svgPath: "/patterns/sleeve-plain.svg" },
];
