// A hex color in words an AI (or a person) understands: the nearest of a small palette.
const PALETTE: readonly [string, string][] = [
  ["negro", "#111111"],
  ["blanco", "#ffffff"],
  ["gris", "#808080"],
  ["gris claro", "#c4c4c4"],
  ["gris oscuro", "#444444"],
  ["rojo", "#e00000"],
  ["bordó", "#800020"],
  ["naranja", "#ff7a00"],
  ["amarillo", "#ffe000"],
  ["dorado", "#f5b700"],
  ["verde", "#1faa3c"],
  ["verde oscuro", "#0a5c36"],
  ["verde claro", "#7ed957"],
  ["celeste", "#5bc0eb"],
  ["azul", "#1e50d0"],
  ["azul marino", "#0b1f5c"],
  ["violeta", "#7b2fbf"],
  ["rosa", "#ff7eb6"],
  ["fucsia", "#e0188a"],
  ["marrón", "#6b3e1f"],
  ["beige", "#e8d8b0"],
  ["turquesa", "#1abc9c"],
];

function rgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}

export function colorName(hex: string): string {
  const target = rgb(hex);
  if (!target) return "un color";
  let best = PALETTE[0][0];
  let bestDistance = Infinity;
  for (const [name, value] of PALETTE) {
    const color = rgb(value)!;
    const distance = color.reduce((sum, channel, i) => sum + (channel - target[i]) ** 2, 0);
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}
