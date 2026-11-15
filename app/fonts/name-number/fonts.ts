import localFont from "next/font/local";

// The name and number typefaces (lib/builder/catalog/name-number-presets.ts), one CSS variable each.
// preload: false, so each downloads only when something shows it, not on every visit.
const bloque = localFont({ src: "./bloque.ttf", variable: "--font-nn-bloque", preload: false });
const compacta = localFont({ src: "./compacta.ttf", variable: "--font-nn-compacta", preload: false });
const angosta = localFont({ src: "./angosta.otf", variable: "--font-nn-angosta", preload: false });
const cuadrada = localFont({ src: "./cuadrada.ttf", variable: "--font-nn-cuadrada", preload: false });
const retro = localFont({ src: "./retro.ttf", variable: "--font-nn-retro", preload: false });
const curva = localFont({ src: "./curva.ttf", variable: "--font-nn-curva", preload: false });
const redondeada = localFont({ src: "./redondeada.otf", variable: "--font-nn-redondeada", preload: false });
const clasica = localFont({ src: "./clasica.ttf", variable: "--font-nn-clasica", preload: false });
const fina = localFont({ src: "./fina.ttf", variable: "--font-nn-fina", preload: false });
const ancha = localFont({ src: "./ancha.ttf", variable: "--font-nn-ancha", preload: false });

/** Class names that declare every typeface's CSS variable; set on <html>. */
export const nameNumberFontVariables = [bloque, compacta, angosta, cuadrada, retro, curva, redondeada, clasica, fina, ancha]
  .map((font) => font.variable)
  .join(" ");
