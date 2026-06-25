import {
  Inter,
  Playfair_Display,
  EB_Garamond,
  Archivo,
  JetBrains_Mono,
} from "next/font/google";

// Shared font instances. Each exposes a CSS variable applied on <html> so both
// Tailwind tokens (@theme in globals.css) and the SVG poster can reference them.
// The poster's layout engine measures text via a probe element's *computed*
// font, so it always matches whatever next/font resolves these variables to.

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Hero display face (vintage titles, night-sky headings).
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// Hero body face (vintage place names + italic distances).
export const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

// Heavy geometric sans for the bold-modern template.
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

// Technical monospace for the blueprint template's labels.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = `${inter.variable} ${playfair.variable} ${garamond.variable} ${archivo.variable} ${jetbrainsMono.variable}`;
