// GEPE's own size charts, as the pictures it publishes (public/talles): the measures of each size and how
// to take them. They are shown as they are, not retyped into a table, so they always say what GEPE says.
export type SizeGuide = {
  id: "shirt" | "shorts";
  label: string;
  image: string;
  /** What the picture says, for those who cannot see it. */
  alt: string;
};

export const SIZE_GUIDES: readonly SizeGuide[] = [
  {
    id: "shirt",
    label: "Camiseta",
    image: "/talles/camiseta.webp",
    alt:
      "Guía de talles y medidas de la camiseta, remera recta y kids, en centímetros, con una tolerancia de más o menos 2 cm. " +
      "Kids, talles 2, 4, 6, 8, 10, 12 y 14: largo 39, 42, 45, 48, 50, 51 y 53; ancho 30, 33, 35, 38, 39, 40 y 44. " +
      "Rectas, talles XS, S, M, L, XL, XXL, XXXL y XXXXL: largo 60, 64, 67, 69, 71, 74, 77 y 82; ancho 44, 46, 49, 51, 55, 61, 63 y 68. " +
      "Las medidas se toman sobre otra prenda, no sobre el cuerpo. El largo va desde la base del cuello, en línea recta hacia abajo; " +
      "el ancho, de una sisa a la otra.",
  },
  {
    id: "shorts",
    label: "Short",
    image: "/talles/short.webp",
    alt:
      "Guía de talles y medidas del corto de fútbol adulto, en centímetros, con una tolerancia de más o menos 2 cm. " +
      "Talles XS, S, M, L, XL, XXL y XXXL: largo 42, 45, 47, 50, 51, 54 y 57; cadera 37, 44, 50, 51, 55, 57 y 60; " +
      "botamanga 27, 28, 30, 31, 31, 32 y 32. Las medidas se toman sobre otra prenda, no sobre el cuerpo, y sin usar prendas de jean. " +
      "El largo va desde el principio de la cintura hacia abajo; la cadera, en la parte más ancha, de costura a costura; " +
      "la botamanga, en la base de la pierna.",
  },
];

/** The charts that go with an order: the shirt's, and the shorts' when the kit has them. */
export function guidesFor({ withShorts }: { withShorts: boolean }): SizeGuide[] {
  return SIZE_GUIDES.filter((guide) => guide.id === "shirt" || withShorts);
}
