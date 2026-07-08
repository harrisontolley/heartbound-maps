import { describe, expect, it } from "vitest";
import { buildCoordinateStory } from "./coordinateStory.js";

// Pure builder — no I/O. Reads an order_item's poster_config JSON snapshot
// (frontend/src/lib/commerce/posterConfig.ts's PosterConfigSnapshot, stored as
// untyped jsonb) defensively, since it can be a legacy/malformed snapshot, and
// must never throw. Mirrors frontend/src/lib/geo/places.ts's computePlaces:
// same bearing-mode switch, same "coincides with home" skip — so the
// distances/directions here always agree with what's drawn on the print.

const MELBOURNE = { lat: -37.8136, lng: 144.9631, label: "Melbourne, Victoria, Australia" };
const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const CAPE_TOWN = { lat: -33.9249, lng: 18.4241 };

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    home: MELBOURNE,
    places: [
      { id: "p1", label: "Sydney", affiliation: "born", lat: SYDNEY.lat, lng: SYDNEY.lng },
    ],
    units: "km",
    bearingMode: "great-circle",
    ...overrides,
  };
}

describe("buildCoordinateStory", () => {
  it("returns null for non-object input", () => {
    expect(buildCoordinateStory(null)).toBeNull();
    expect(buildCoordinateStory(undefined)).toBeNull();
    expect(buildCoordinateStory("nope")).toBeNull();
    expect(buildCoordinateStory(42)).toBeNull();
  });

  it("returns null when home is missing or malformed", () => {
    expect(buildCoordinateStory({})).toBeNull();
    expect(buildCoordinateStory({ home: { label: "No coords" }, places: [] })).toBeNull();
    expect(buildCoordinateStory({ home: { lat: 1, lng: 2 }, places: [] })).toBeNull(); // no label
  });

  it("returns null when there are no valid places", () => {
    expect(buildCoordinateStory(baseConfig({ places: [] }))).toBeNull();
    expect(buildCoordinateStory(baseConfig({ places: "not-an-array" }))).toBeNull();
  });

  it("builds one sentence per valid place, naming the affiliation, distance, and compass direction", () => {
    const story = buildCoordinateStory(baseConfig());
    expect(story).not.toBeNull();
    expect(story!.homeLabel).toBe("Melbourne, Victoria, Australia");
    expect(story!.places).toHaveLength(1);
    const [sydney] = story!.places;
    expect(sydney.label).toBe("Sydney");
    // Melbourne → Sydney is ~713 km, bearing ~53° (NE-ish); assert on the
    // composed sentence rather than internals so this locks in the public shape.
    expect(sydney.sentence).toContain("Born in Sydney");
    expect(sydney.sentence).toMatch(/\d[\d,]* km to the/);
    expect(sydney.sentence.endsWith(".")).toBe(true);
  });

  it("uses the 'Visited' verb without a trailing 'in' (matches the studio's affiliation copy)", () => {
    const story = buildCoordinateStory(
      baseConfig({ places: [{ label: "Tokyo", affiliation: "visited", lat: 35.6762, lng: 139.6503 }] }),
    );
    expect(story!.places[0].sentence).toMatch(/^Visited Tokyo,/);
  });

  it("falls back to a generic phrase for an unknown/missing affiliation", () => {
    const story = buildCoordinateStory(
      baseConfig({ places: [{ label: "Somewhere", lat: 10, lng: 10 }] }),
    );
    expect(story!.places[0].sentence).toMatch(/^Connected to Somewhere,/);
  });

  it("respects units: mi produces a miles-formatted distance", () => {
    const km = buildCoordinateStory(baseConfig({ units: "km" }))!.places[0].sentence;
    const mi = buildCoordinateStory(baseConfig({ units: "mi" }))!.places[0].sentence;
    expect(km).toContain("km");
    expect(mi).toContain("mi");
    expect(km).not.toBe(mi);
  });

  it("defaults to km when units is missing or invalid", () => {
    const story = buildCoordinateStory(baseConfig({ units: undefined }));
    expect(story!.places[0].sentence).toContain("km");
    const story2 = buildCoordinateStory(baseConfig({ units: "furlongs" }));
    expect(story2!.places[0].sentence).toContain("km");
  });

  it("respects bearing mode: rhumb can name a different compass direction than great-circle", () => {
    const config = {
      home: { lat: BRISBANE().lat, lng: BRISBANE().lng, label: "Brisbane" },
      places: [{ label: "Cape Town", affiliation: "visited", lat: CAPE_TOWN.lat, lng: CAPE_TOWN.lng }],
      units: "km",
    };
    const greatCircle = buildCoordinateStory({ ...config, bearingMode: "great-circle" })!.places[0];
    const rhumb = buildCoordinateStory({ ...config, bearingMode: "rhumb" })!.places[0];
    // Great-circle Brisbane→Cape Town is ~218° (southwest); rhumb is ~267° (west).
    expect(greatCircle.sentence).toContain("to the southwest of home");
    expect(rhumb.sentence).toContain("to the west of home");
    expect(rhumb.sentence).not.toBe(greatCircle.sentence);
  });

  it("defaults to great-circle when bearingMode is missing or invalid", () => {
    const story = buildCoordinateStory(baseConfig({ bearingMode: undefined }));
    const storyGc = buildCoordinateStory(baseConfig({ bearingMode: "great-circle" }));
    expect(story!.places[0].sentence).toBe(storyGc!.places[0].sentence);
  });

  it("skips a place that coincides with home (within 1 km)", () => {
    const story = buildCoordinateStory(
      baseConfig({
        places: [
          { label: "Right here", affiliation: "born", lat: MELBOURNE.lat, lng: MELBOURNE.lng },
        ],
      }),
    );
    expect(story).toBeNull();
  });

  it("skips an individual malformed place but keeps the other valid ones", () => {
    const story = buildCoordinateStory(
      baseConfig({
        places: [
          { label: "Missing coords" },
          { label: "Sydney", affiliation: "born", lat: SYDNEY.lat, lng: SYDNEY.lng },
          { lat: 1, lng: 1 }, // missing label
          "not an object",
        ],
      }),
    );
    expect(story!.places).toHaveLength(1);
    expect(story!.places[0].label).toBe("Sydney");
  });

  it("preserves place order as authored", () => {
    const story = buildCoordinateStory(
      baseConfig({
        places: [
          { label: "Sydney", affiliation: "born", lat: SYDNEY.lat, lng: SYDNEY.lng },
          { label: "Cape Town", affiliation: "visited", lat: CAPE_TOWN.lat, lng: CAPE_TOWN.lng },
        ],
      }),
    );
    expect(story!.places.map((p) => p.label)).toEqual(["Sydney", "Cape Town"]);
  });

  it("never uses banned punctuation (em/en dash, exclamation) or the word poster in composed sentences", () => {
    // Exercise every affiliation + a spread of bearings so every verb phrase
    // and every compass word gets composed at least once.
    const affiliations = ["born", "lived", "studied", "met", "married", "family", "visited", "adventure", "unknown"];
    const places = affiliations.map((affiliation, i) => ({
      label: `Place ${i}`,
      affiliation,
      lat: (i - 4) * 8,
      lng: (i - 4) * 40,
    }));
    const story = buildCoordinateStory(baseConfig({ places }));
    for (const p of story!.places) {
      expect(p.sentence).not.toMatch(/[—–]/);
      expect(p.sentence).not.toMatch(/!/);
      expect(p.sentence.toLowerCase()).not.toContain("poster");
    }
  });
});

function BRISBANE() {
  return { lat: -27.4698, lng: 153.0251 };
}
