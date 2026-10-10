import { findPattern, visibleColors } from "@/lib/builder/catalog/patterns";
import { shortsColor } from "@/lib/builder/state/design-state";
import type { Order } from "./order";
import { colorName } from "./color-name";

// An example prompt for any image AI: the user attaches the two shirt images and a
// photo of the person, and pastes this. The images carry the real design; the words
// repeat it so the AI does not "improve" it.
export function buildAiPrompt({ design, roster }: Pick<Order, "design" | "roster">): string {
  const roles = new Set(visibleColors(design.bodyPatternId, design.sleevePatternId).map((c) => c.role));
  const color = (role: "primary" | "secondary" | "accent" | "collar") => colorName(design.colors[role]);

  const pattern = findPattern(design.bodyPatternId)?.label.toLowerCase() ?? "liso";
  const shirt = [`diseño ${pattern}`, `color principal ${color("primary")}`];
  if (roles.has("secondary")) shirt.push(`segundo color ${color("secondary")}`);
  if (roles.has("accent")) shirt.push(`detalles en ${color("accent")}`);
  shirt.push(`cuello ${color("collar")}`);

  const extras: string[] = [];
  if (design.logoDataUrl) extras.push("Lleva un escudo en el pecho.");
  if (Object.keys(design.sponsors).length > 0) extras.push("Lleva sponsors, tal como en las imágenes.");
  const { name, number } = roster[0] ?? { name: "", number: "" };
  const back = [name && `el nombre ${name}`, number && `el número ${number}`].filter(Boolean).join(" y ");
  if (back) extras.push(`En la espalda dice ${back}.`);
  if (design.shorts.included) extras.push(`Con el short ${colorName(shortsColor(design))}, como en las imágenes.`);

  return [
    "Quiero una imagen realista de la persona de la foto que adjunto, vestida con la camiseta de fútbol de las imágenes adjuntas (frente y espalda).",
    `La camiseta: ${shirt.join(", ")}. ${extras.join(" ")}`.trim(),
    "Copiá la camiseta exactamente como se ve en las imágenes: mismos colores, mismo diseño y mismos detalles. No inventes logos ni textos.",
    "Mantené la cara, el pelo y los rasgos de la persona de mi foto; tiene que reconocerse.",
    "Escena: foto de cuerpo entero, mirando a cámara, en una cancha de fútbol al atardecer, con estilo de fotografía deportiva.",
  ].join("\n\n");
}
