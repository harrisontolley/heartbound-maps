import { describe, it, expect, beforeEach } from "vitest";
import { useTripStore, TRIP_SEED } from "./tripStore";
import type { GeoResult } from "../types";

const PARIS: GeoResult = {
  id: "geo-paris",
  label: "Paris",
  fullName: "Paris, Île-de-France, France",
  lat: 48.8566,
  lng: 2.3522,
};

beforeEach(() => {
  useTripStore.getState().reset();
});

describe("tripStore", () => {
  it("seeds the round-the-world itinerary", () => {
    expect(useTripStore.getState().stops).toHaveLength(TRIP_SEED.length);
    expect(useTripStore.getState().stops[0].label).toBe("Sydney");
  });

  it("appends a new stop and rejects a near-duplicate", () => {
    const before = useTripStore.getState().stops.length;
    expect(useTripStore.getState().addStop(PARIS)).toBe("added");
    expect(useTripStore.getState().stops).toHaveLength(before + 1);
    expect(useTripStore.getState().stops.at(-1)?.label).toBe("Paris");
    expect(useTripStore.getState().addStop(PARIS)).toBe("duplicate");
    expect(useTripStore.getState().stops).toHaveLength(before + 1);
  });

  it("reorders stops and is a no-op at the boundaries", () => {
    const ids = useTripStore.getState().stops.map((s) => s.id);
    useTripStore.getState().moveStop(ids[1], "up");
    expect(useTripStore.getState().stops.map((s) => s.id)).toEqual([
      ids[1], ids[0], ids[2], ids[3], ids[4],
    ]);
    // first up / last down do nothing
    const now = useTripStore.getState().stops.map((s) => s.id);
    useTripStore.getState().moveStop(now[0], "up");
    useTripStore.getState().moveStop(now.at(-1)!, "down");
    expect(useTripStore.getState().stops.map((s) => s.id)).toEqual(now);
  });

  it("removes a stop and renames a stop", () => {
    const id = useTripStore.getState().stops[0].id;
    useTripStore.getState().setLabel(id, "Home");
    expect(useTripStore.getState().stops[0].label).toBe("Home");
    useTripStore.getState().removeStop(id);
    expect(useTripStore.getState().stops.find((s) => s.id === id)).toBeUndefined();
  });

  it("flips style toggles", () => {
    useTripStore.getState().setLoopHome(true);
    useTripStore.getState().setShowBackdrop(false);
    useTripStore.getState().setRouteStyle("straight");
    useTripStore.getState().setProjection("fit");
    const s = useTripStore.getState();
    expect(s.loopHome).toBe(true);
    expect(s.showBackdrop).toBe(false);
    expect(s.routeStyle).toBe("straight");
    expect(s.projection).toBe("fit");
  });
});
