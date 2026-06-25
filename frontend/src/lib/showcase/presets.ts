import type { Place, Units } from "@/lib/types";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";

/**
 * Hand-built poster presets used to generate the landing-page imagery.
 *
 * These drive the dev-only `/render/[id]` route and the `render-posters` script
 * (see frontend/scripts/render-posters.ts). Coordinates are hardcoded real
 * cities so generation needs no geocoder/backend. Each preset maps to one media
 * slot in the landing copy (frontend/src/components/landing/copy.ts) and the
 * twelve together cover all eight templates.
 */

export type PosterPreset = {
  /** Stable slug — also the output filename, e.g. "/showcase/<slug>.png". */
  slug: string;
  /** Which kind of landing slot this fills (informational). */
  slot: "hero" | "feature" | "showcase" | "exportCard";
  templateId: TemplateId;
  /** Only consulted when templateId === "vintage-cartography". */
  vintageVariant?: VintageVariant;
  units: Units;
  home: Place;
  /** Each must be ≥1km from home — computePlaces drops anything closer. */
  places: Place[];
  title?: string | null;
  subtitle?: string | null;
  footer?: string | null;
};

let n = 0;
const P = (
  label: string,
  lat: number,
  lng: number,
  affiliation: Place["affiliation"],
  fullName = label,
): Place => ({ id: `p${n++}`, label, fullName, lat, lng, affiliation });

const home = (label: string, lat: number, lng: number): Place => ({
  id: `home-${n++}`,
  label,
  fullName: label,
  lat,
  lng,
  affiliation: "lived",
});

export const PRESETS: PosterPreset[] = [
  {
    slug: "hero-home-london",
    slot: "hero",
    templateId: "vintage-cartography",
    vintageVariant: "classic",
    units: "km",
    home: home("London", 51.5074, -0.1278),
    places: [
      P("New York", 40.7128, -74.006, "visited"),
      P("Paris", 48.8566, 2.3522, "lived"),
      P("Edinburgh", 55.9533, -3.1883, "born"),
      P("Sydney", -33.8688, 151.2093, "family"),
      P("Lisbon", 38.7223, -9.1393, "visited"),
    ],
  },
  {
    slug: "feature-vintage",
    slot: "feature",
    templateId: "vintage-cartography",
    vintageVariant: "classic",
    units: "km",
    home: home("Rome", 41.9028, 12.4964),
    places: [
      P("London", 51.5074, -0.1278, "family"),
      P("Istanbul", 41.0082, 28.9784, "visited"),
      P("Tunis", 36.8065, 10.1815, "visited"),
      P("Lisbon", 38.7223, -9.1393, "lived"),
    ],
  },
  {
    slug: "feature-minimal",
    slot: "feature",
    templateId: "minimal-compass",
    units: "km",
    home: home("Copenhagen", 55.6761, 12.5683),
    places: [
      P("Oslo", 59.9139, 10.7522, "family"),
      P("Berlin", 52.52, 13.405, "lived"),
      P("Tokyo", 35.6762, 139.6503, "visited"),
      P("New York", 40.7128, -74.006, "visited"),
    ],
  },
  {
    slug: "feature-bold",
    slot: "feature",
    templateId: "bold-modern",
    units: "mi",
    home: home("Los Angeles", 34.0522, -118.2437),
    places: [
      P("Vancouver", 49.2827, -123.1207, "visited"),
      P("New York", 40.7128, -74.006, "lived"),
      P("Mexico City", 19.4326, -99.1332, "family"),
      P("Tokyo", 35.6762, 139.6503, "visited"),
    ],
  },
  {
    slug: "feature-night-sky",
    slot: "feature",
    templateId: "night-sky",
    units: "km",
    home: home("Reykjavik", 64.1466, -21.9426),
    places: [
      P("Tromsø", 69.6492, 18.9553, "family"),
      P("Stockholm", 59.3293, 18.0686, "lived"),
      P("Lisbon", 38.7223, -9.1393, "born"),
      P("New York", 40.7128, -74.006, "visited"),
    ],
  },
  {
    slug: "showcase-transatlantic-family",
    slot: "showcase",
    templateId: "vintage-cartography",
    vintageVariant: "atlas",
    units: "km",
    home: home("London", 51.5074, -0.1278),
    places: [
      P("Stockholm", 59.3293, 18.0686, "family"),
      P("Naples", 40.8518, 14.2681, "family"),
      P("Lagos", 6.5244, 3.3792, "family"),
      P("Buenos Aires", -34.6037, -58.3816, "family"),
      P("New York", 40.7128, -74.006, "family"),
    ],
  },
  {
    slug: "showcase-decade-of-moves",
    slot: "showcase",
    templateId: "topographic",
    units: "mi",
    home: home("Denver", 39.7392, -104.9903),
    places: [
      P("Austin", 30.2672, -97.7431, "lived"),
      P("Seattle", 47.6062, -122.3321, "lived"),
      P("Boston", 42.3601, -71.0589, "lived"),
      P("Atlanta", 33.749, -84.388, "lived"),
      P("Portland", 45.5152, -122.6784, "lived"),
    ],
  },
  {
    slug: "showcase-student-years-abroad",
    slot: "showcase",
    templateId: "blueprint",
    units: "km",
    home: home("Manchester", 53.4808, -2.2426),
    places: [
      P("Reykjavik", 64.1466, -21.9426, "visited"),
      P("Vienna", 48.2082, 16.3738, "lived"),
      P("Barcelona", 41.3851, 2.1734, "lived"),
      P("Lisbon", 38.7223, -9.1393, "lived"),
    ],
  },
  {
    slug: "showcase-coastal-hometowns",
    slot: "showcase",
    templateId: "minimal-compass",
    units: "km",
    home: home("Brighton", 50.8225, -0.1372),
    places: [
      P("San Sebastián", 43.3183, -1.9812, "visited"),
      P("Split", 43.5081, 16.4402, "visited"),
      P("Galway", 53.2707, -9.0568, "family"),
      P("Nice", 43.7102, 7.262, "visited"),
    ],
  },
  {
    slug: "showcase-three-continents",
    slot: "showcase",
    templateId: "constellation",
    units: "km",
    home: home("Singapore", 1.3521, 103.8198),
    places: [
      P("Nairobi", -1.2921, 36.8219, "family"),
      P("São Paulo", -23.5505, -46.6333, "visited"),
      P("Vancouver", 49.2827, -123.1207, "lived"),
      P("Dubai", 25.2048, 55.2708, "visited"),
    ],
  },
  {
    slug: "showcase-one-long-road-trip",
    slot: "showcase",
    templateId: "art-deco",
    units: "mi",
    home: home("Chicago", 41.8781, -87.6298),
    places: [
      P("Toronto", 43.6532, -79.3832, "visited"),
      P("New York", 40.7128, -74.006, "visited"),
      P("Atlanta", 33.749, -84.388, "visited"),
      P("New Orleans", 29.9511, -90.0715, "visited"),
      P("Denver", 39.7392, -104.9903, "visited"),
    ],
  },
  {
    slug: "exportcard-export-formats",
    slot: "exportCard",
    templateId: "bold-modern",
    units: "km",
    home: home("Amsterdam", 52.3676, 4.9041),
    places: [
      P("Oslo", 59.9139, 10.7522, "family"),
      P("Rome", 41.9028, 12.4964, "visited"),
      P("Madrid", 40.4168, -3.7038, "visited"),
      P("New York", 40.7128, -74.006, "visited"),
    ],
  },
];

export function getPreset(slug: string): PosterPreset | undefined {
  return PRESETS.find((p) => p.slug === slug);
}
