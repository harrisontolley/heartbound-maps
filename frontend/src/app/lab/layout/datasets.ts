import type { Place, Units } from "@/lib/types";
import type { Computed } from "@/lib/types";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";
import { PRESETS } from "@/lib/showcase/presets";
import { SEED_HOME, SEED_PLACES } from "@/lib/seed";

/**
 * A test poster for the layout lab. Either supply real `places` (run through
 * `computePlaces`) or a synthetic `computed` array with bearings/distances set
 * directly — handy for adversarial cases the geocoder would never produce.
 */
export type LabDataset = {
  id: string;
  label: string;
  units: Units;
  templateId?: TemplateId;
  vintageVariant?: VintageVariant;
  home: Place;
  places?: Place[];
  computed?: Computed[];
};

const synthHome: Place = {
  id: "lab-home",
  label: "Home",
  fullName: "Home",
  lat: 0,
  lng: 0,
  affiliation: "lived",
};

const C = (
  id: string,
  label: string,
  bearingDeg: number,
  distanceKm: number,
  affiliation: Place["affiliation"] = "visited",
): Computed => ({ id, label, fullName: label, lat: 0, lng: 0, affiliation, distanceKm, bearingDeg });

// Deterministic PRNG (matches the engine stress test) for the random scenarios.
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const NAMES = ["Lisbon", "Reykjavik", "Singapore", "Vancouver", "Nairobi", "Auckland", "Oslo", "Cairo"];

function randomScenario(seed: number): Computed[] {
  const rng = mulberry32(seed + 1);
  const n = 3 + Math.floor(rng() * 6); // 3..8
  const ties: Place["affiliation"][] = [
    "born",
    "lived",
    "studied",
    "met",
    "married",
    "family",
    "visited",
    "adventure",
  ];
  return Array.from({ length: n }, (_, k) => {
    const cluster = Math.floor(rng() * 4) * 90;
    const bearingDeg = (cluster + (rng() - 0.5) * 40 + 360) % 360;
    return C(String(k), NAMES[k % NAMES.length], bearingDeg, 50 + Math.floor(rng() * 17950), ties[k % ties.length]);
  });
}

const synthetic: LabDataset[] = [
  {
    id: "brisbane-ne",
    label: "Brisbane → NY / SF / Bangkok",
    units: "km",
    home: { ...synthHome, label: "Brisbane" },
    // The reported case: NY & SF are a near-collinear NE cluster (NY farther → its
    // label must end up ABOVE SF's); Bangkok is NW.
    computed: [
      C("ny", "New York", 58.46, 15501, "lived"),
      C("sf", "San Francisco", 53.7, 11395, "visited"),
      C("bkk", "Bangkok", 302.1, 7283, "family"),
    ],
  },
  {
    id: "south-fan",
    label: "South fan (farther = lower)",
    units: "km",
    home: synthHome,
    computed: [
      C("near", "Hobart", 179, 9000, "visited"),
      C("mid", "Wellington", 181, 10500, "lived"),
      C("far", "Christchurch", 180, 12000, "family"),
    ],
  },
  {
    id: "two-same-bearing",
    label: "Two cities, same direction",
    units: "km",
    home: synthHome,
    computed: [
      C("a", "San Francisco", 90, 2000, "lived"),
      C("b", "Los Angeles", 90, 9000, "visited"),
    ],
  },
  {
    id: "five-tight-fan",
    label: "Near-collinear NE fan (5)",
    units: "km",
    home: synthHome,
    computed: [
      C("sf", "San Francisco", 53.7, 11395, "visited"),
      C("la", "Los Angeles", 58.6, 11565, "lived"),
      C("ny", "New York", 58.5, 15501, "born"),
      C("sea", "Seattle", 44.4, 11848, "family"),
      C("van", "Vancouver", 42.6, 11866, "visited"),
    ],
  },
  {
    id: "eight-spread",
    label: "Eight, evenly spread",
    units: "km",
    home: synthHome,
    computed: Array.from({ length: 8 }, (_, i) =>
      C(String(i), NAMES[i], i * 45 + 5, 800 + i * 600, (["born", "lived", "visited", "family"] as const)[i % 4]),
    ),
  },
  {
    id: "wide-edges",
    label: "Wide labels at the edges",
    units: "km",
    home: synthHome,
    computed: [
      C("w", "Santiago de Compostela", 270, 9000, "visited"),
      C("e", "Saint Petersburg", 90, 9000, "lived"),
      C("n", "Longyearbyen", 0, 4000, "born"),
      C("s", "Christchurch", 180, 12000, "family"),
    ],
  },
  { id: "rand-7", label: "Random seed #7", units: "km", home: synthHome, computed: randomScenario(7) },
  { id: "rand-32", label: "Random seed #32", units: "km", home: synthHome, computed: randomScenario(32) },
  { id: "rand-169", label: "Random seed #169 (dense)", units: "km", home: synthHome, computed: randomScenario(169) },
];

const seed: LabDataset = {
  id: "seed-nyc",
  label: "Seed — New York (5)",
  units: "km",
  templateId: "warm-minimal",
  home: SEED_HOME,
  places: SEED_PLACES,
};

const presets: LabDataset[] = PRESETS.map((p) => ({
  id: `preset-${p.slug}`,
  label: `Preset — ${p.slug}`,
  units: p.units,
  templateId: p.templateId,
  vintageVariant: p.vintageVariant,
  home: p.home,
  places: p.places,
}));

export const LAB_DATASETS: LabDataset[] = [seed, ...synthetic, ...presets];
