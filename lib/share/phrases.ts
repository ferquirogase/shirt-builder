export const STORY_PHRASES: readonly string[] = [
  "Esta camiseta es para ganar",
  "Se viene el campeón",
  "Así se ve ganar",
  "Hoy se juega con estilo",
  "El once más lindo de la liga",
  "Con esta no se pierde",
  "Presentando a los nuevos campeones",
  "Ya hay camiseta, faltan los goles",
  "La del barrio, la del tercer tiempo",
  "Para salir campeones",
];

// A random phrase other than the one on screen. `random` is injectable for tests.
export function nextPhrase(current: string | null, random: () => number = Math.random): string {
  const options = STORY_PHRASES.filter((phrase) => phrase !== current);
  const index = Math.min(options.length - 1, Math.floor(random() * options.length));
  return options[index];
}
