import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest). Colors match the
 * warm-gallery palette in globals.css (--color-canvas / --color-ink). The only
 * icon asset today is favicon.ico; proper PNG app icons are a follow-up once a
 * logo mark exists.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pinprint",
    short_name: "Pinprint",
    description:
      "Personalized map wall art, made to order as a custom fine art print.",
    start_url: "/",
    display: "browser",
    background_color: "#faf8f3",
    theme_color: "#faf8f3",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
