import { describe, expect, it } from "vitest";
import { usePosterStore } from "@/lib/store/posterStore";
import { snapshotPosterConfig, snapshotSummary } from "./posterConfig";

// The snapshot must be a fully decoupled copy: editing the studio after adding to
// cart must not mutate the already-snapshotted poster.

describe("snapshotPosterConfig", () => {
  it("captures the current studio design", () => {
    usePosterStore.setState({ templateId: "art-deco", productId: "portrait-24x36", format: "print", addFrame: true });
    const snap = snapshotPosterConfig();
    expect(snap.templateId).toBe("art-deco");
    expect(snap.productId).toBe("portrait-24x36");
    expect(snap.addFrame).toBe(true);
  });

  it("is decoupled from later store edits (deep copy of places/home)", () => {
    usePosterStore.setState({
      home: { id: "h", label: "London", fullName: "London, UK", lat: 51.5, lng: -0.1, affiliation: "lived" },
      places: [{ id: "p1", label: "Paris", fullName: "Paris, FR", lat: 48.8, lng: 2.3, affiliation: "visited" }],
    });
    const snap = snapshotPosterConfig();
    // Mutate the store after snapshotting.
    usePosterStore.setState({ home: null, places: [] });
    expect(snap.home?.label).toBe("London");
    expect(snap.places).toHaveLength(1);
    expect(snap.places[0].label).toBe("Paris");
  });
});

describe("snapshotSummary", () => {
  it("joins the home label and size", () => {
    const snap = snapshotPosterConfig();
    expect(snapshotSummary({ ...snap, home: { ...(snap.home ?? ({} as never)), label: "Berlin" } }, "16 × 24 in")).toBe(
      "Berlin · 16 × 24 in",
    );
  });

  it("falls back to a generic label without a home", () => {
    const snap = snapshotPosterConfig();
    expect(snapshotSummary({ ...snap, home: null }, "12 × 18 in")).toBe("Custom map · 12 × 18 in");
  });
});
