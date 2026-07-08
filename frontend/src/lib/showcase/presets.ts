import type { Place, Units } from "@/lib/types";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";

/**
 * Hand-built poster presets used to generate the landing-page imagery.
 *
 * These drive the dev-only `/render/[id]` route and the `render-posters` script
 * (see frontend/scripts/render-posters.ts). Coordinates are hardcoded real
 * cities so generation needs no geocoder/backend. Three families:
 *
 *  - `look-<lookId>`: one per studio look (src/lib/looks/looks.ts), used by the
 *    landing style gallery. Distinct geography per look so the grid never repeats.
 *  - `story-*`: the evocative example prints ("Made with Heartbound Maps" stories).
 *  - `hero-poster` / `exportcard-*`: singles consumed by the hero scene
 *    compositor (scripts/compose-scenes.ts) and the export/craft imagery.
 *
 * NOTE: the committed PNGs under public/showcase are pre-rendered. After changing
 * a preset, regenerate with `pnpm --filter @heartbound/frontend render:posters`
 * (on-demand; needs Playwright + a dev server).
 */

export type PosterPreset = {
  /** Stable slug — also the output filename, e.g. "/showcase/<slug>.png". */
  slug: string;
  /** Which kind of landing slot this fills (informational). */
  slot: "hero" | "look" | "story" | "exportCard";
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
  // ── Hero: the poster composited into the hero lifestyle scene ─────────────
  {
    slug: "hero-poster",
    slot: "hero",
    templateId: "warm-minimal",
    units: "mi",
    home: home("San Francisco", 37.7749, -122.4194),
    places: [
      P("Seoul", 37.5665, 126.978, "born"),
      P("Chicago", 41.8781, -87.6298, "lived"),
      P("Oaxaca", 17.0732, -96.7266, "family"),
      P("Lisbon", 38.7223, -9.1393, "visited"),
      P("Sydney", -33.8688, 151.2093, "visited"),
    ],
  },

  // ── One render per studio look (style gallery) ────────────────────────────
  {
    slug: "look-warm-minimal",
    slot: "look",
    templateId: "warm-minimal",
    units: "km",
    home: home("Florence", 43.7696, 11.2558),
    places: [
      P("London", 51.5074, -0.1278, "lived"),
      P("Copenhagen", 55.6761, 12.5683, "visited"),
      P("New York", 40.7128, -74.006, "visited"),
      P("Kyoto", 35.0116, 135.7681, "visited"),
    ],
  },
  {
    slug: "look-mid-century",
    slot: "look",
    templateId: "mid-century",
    units: "mi",
    home: home("Palm Springs", 33.8303, -116.5453),
    places: [
      P("Los Angeles", 34.0522, -118.2437, "lived"),
      P("Chicago", 41.8781, -87.6298, "born"),
      P("Mexico City", 19.4326, -99.1332, "visited"),
      P("Austin", 30.2672, -97.7431, "family"),
    ],
  },
  {
    slug: "look-swiss",
    slot: "look",
    templateId: "swiss-editorial",
    units: "km",
    home: home("Zürich", 47.3769, 8.5417),
    places: [
      P("Milan", 45.4642, 9.19, "family"),
      P("Paris", 48.8566, 2.3522, "lived"),
      P("Berlin", 52.52, 13.405, "lived"),
      P("Vienna", 48.2082, 16.3738, "visited"),
    ],
  },
  {
    slug: "look-celestial",
    slot: "look",
    templateId: "celestial",
    units: "km",
    home: home("Queenstown", -45.0312, 168.6626),
    places: [
      P("Auckland", -36.8485, 174.7633, "born"),
      P("Sydney", -33.8688, 151.2093, "lived"),
      P("Tokyo", 35.6762, 139.6503, "visited"),
      P("Santiago", -33.4489, -70.6693, "visited"),
    ],
  },
  {
    slug: "look-nightfall",
    slot: "look",
    templateId: "night-sky",
    units: "km",
    home: home("Oslo", 59.9139, 10.7522),
    places: [
      P("Tromsø", 69.6492, 18.9553, "family"),
      P("Reykjavik", 64.1466, -21.9426, "visited"),
      P("Edinburgh", 55.9533, -3.1883, "lived"),
      P("Montreal", 45.5017, -73.5673, "visited"),
    ],
  },
  {
    slug: "look-blueprint",
    slot: "look",
    templateId: "blueprint",
    units: "km",
    home: home("Berlin", 52.52, 13.405),
    places: [
      P("Rotterdam", 51.9244, 4.4777, "lived"),
      P("Vienna", 48.2082, 16.3738, "visited"),
      P("Detroit", 42.3314, -83.0458, "born"),
      P("Tallinn", 59.437, 24.7536, "visited"),
    ],
  },
  {
    slug: "look-modern",
    slot: "look",
    templateId: "bold-modern",
    units: "km",
    home: home("Tokyo", 35.6762, 139.6503),
    places: [
      P("Seoul", 37.5665, 126.978, "visited"),
      P("San Francisco", 37.7749, -122.4194, "lived"),
      P("Sydney", -33.8688, 151.2093, "visited"),
      P("Berlin", 52.52, 13.405, "lived"),
    ],
  },
  {
    slug: "look-field-map",
    slot: "look",
    templateId: "topographic",
    units: "mi",
    home: home("Boulder", 40.015, -105.2705),
    places: [
      P("Banff", 51.1784, -115.5708, "visited"),
      P("Moab", 38.5733, -109.5498, "visited"),
      P("Jackson", 43.4799, -110.7624, "lived"),
      P("Flagstaff", 35.1983, -111.6513, "born"),
    ],
  },
  {
    slug: "look-minimal",
    slot: "look",
    templateId: "minimal-compass",
    units: "km",
    home: home("Kyoto", 35.0116, 135.7681),
    places: [
      P("Tokyo", 35.6762, 139.6503, "lived"),
      P("Seoul", 37.5665, 126.978, "visited"),
      P("Portland", 45.5152, -122.6784, "lived"),
      P("Melbourne", -37.8136, 144.9631, "visited"),
    ],
  },

  // ── Story prints ("Made with Heartbound Maps") ───────────────────────────────────
  // Each story home is chosen to sit roughly CENTRAL to its places so the
  // arrows fan out in many directions (≥4 of the 6 compass sextants — checked
  // with initialBearingDeg when these were authored), and together the six
  // posters exercise all 8 affiliations.
  {
    slug: "story-where-it-started",
    slot: "story",
    templateId: "mid-century",
    units: "mi",
    // Bearings from KC: N, NE, ENE, SE, SSE, W/WSW — a full fan.
    home: home("Kansas City", 39.0997, -94.5786),
    places: [
      P("Memphis", 35.1495, -90.049, "born"),
      P("Minneapolis", 44.9778, -93.265, "studied"),
      P("Denver", 39.7392, -104.9903, "lived"),
      P("Chicago", 41.8781, -87.6298, "met"),
      P("New Orleans", 29.9511, -90.0715, "visited"),
      P("Santa Fe", 35.687, -105.9378, "adventure"),
    ],
  },
  {
    slug: "story-the-honeymoon",
    slot: "story",
    templateId: "celestial",
    units: "km",
    // From Auckland: N, ENE, W, WNW, SSW.
    home: home("Auckland", -36.8485, 174.7633),
    places: [
      P("Rarotonga", -21.2129, -159.7823, "married"),
      P("Sydney", -33.8688, 151.2093, "lived"),
      P("Queenstown", -45.0312, 168.6626, "adventure"),
      P("Nadi", -17.7765, 177.4356, "visited", "Nadi, Fiji"),
      P("Bali", -8.4095, 115.1889, "visited"),
    ],
  },
  {
    slug: "story-first-home",
    slot: "story",
    templateId: "minimal-compass",
    units: "mi",
    // From Denver: NE, ENE, SE, WSW, WNW.
    home: home("Denver", 39.7392, -104.9903),
    places: [
      P("San Diego", 32.7157, -117.1611, "born"),
      P("Portland", 45.5152, -122.6784, "lived"),
      P("Austin", 30.2672, -97.7431, "lived"),
      P("Brooklyn", 40.6782, -73.9442, "lived"),
      P("Minneapolis", 44.9778, -93.265, "studied"),
    ],
  },
  {
    slug: "story-family-across-oceans",
    slot: "story",
    templateId: "vintage-cartography",
    vintageVariant: "atlas",
    units: "km",
    // From London: ENE, E, S, WNW, NNW.
    home: home("London", 51.5074, -0.1278),
    places: [
      P("Hong Kong", 22.3193, 114.1694, "family"),
      P("Mumbai", 19.076, 72.8777, "family"),
      P("Lagos", 6.5244, 3.3792, "family"),
      P("Toronto", 43.6532, -79.3832, "family"),
      P("Reykjavik", 64.1466, -21.9426, "family"),
    ],
  },
  {
    slug: "story-the-year-abroad",
    slot: "story",
    templateId: "swiss-editorial",
    units: "km",
    // From Prague: NNE, NW, SE, SSE, SW, WSW.
    home: home("Prague", 50.0755, 14.4378),
    places: [
      P("Lisbon", 38.7223, -9.1393, "visited"),
      P("Athens", 37.9838, 23.7275, "visited"),
      P("Stockholm", 59.3293, 18.0686, "met"),
      P("Marrakech", 31.6295, -7.9811, "visited"),
      P("Istanbul", 41.0082, 28.9784, "visited"),
      P("Edinburgh", 55.9533, -3.1883, "studied"),
    ],
  },
  {
    slug: "story-every-house-so-far",
    slot: "story",
    templateId: "topographic",
    units: "km",
    // From Melbourne: NE, E, W, SSE, NNW.
    home: home("Melbourne", -37.8136, 144.9631),
    places: [
      P("Darwin", -12.4634, 130.8456, "born"),
      P("Perth", -31.9523, 115.8613, "lived"),
      P("Hobart", -42.8821, 147.3272, "lived"),
      P("Brisbane", -27.4698, 153.0251, "lived"),
      P("Auckland", -36.8485, 174.7633, "lived"),
    ],
  },

  // ── Export/craft imagery ───────────────────────────────────────────────────
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
