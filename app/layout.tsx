import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Oswald,
  Montserrat,
  Righteous,
  Anton,
  Playfair_Display,
  Alfa_Slab_One,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Name/number fonts for the jersey canvas. preload: false so they download only
// when a style that uses them is shown, not on every visit.
const nnOswald = Oswald({ variable: "--font-nn-oswald", subsets: ["latin"], preload: false });
const nnMontserrat = Montserrat({ variable: "--font-nn-montserrat", subsets: ["latin"], preload: false });
const nnRighteous = Righteous({ variable: "--font-nn-righteous", subsets: ["latin"], weight: "400", preload: false });
const nnAnton = Anton({ variable: "--font-nn-anton", subsets: ["latin"], weight: "400", preload: false });
const nnPlayfair = Playfair_Display({ variable: "--font-nn-playfair", subsets: ["latin"], preload: false });
const nnAlfaSlab = Alfa_Slab_One({ variable: "--font-nn-alfa-slab", subsets: ["latin"], weight: "400", preload: false });

export const metadata: Metadata = {
  title: "GEPE — Diseñá tu camiseta",
  description: "Diseñá y personalizá la camiseta de tu equipo en 3D.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${nnOswald.variable} ${nnMontserrat.variable} ${nnRighteous.variable} ${nnAnton.variable} ${nnPlayfair.variable} ${nnAlfaSlab.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
