import { describe, it, expect, beforeEach } from "vitest";
import { usePosterStore } from "./posterStore";
import { DEFAULT_TEMPLATE_ID } from "../templates/registry";
import { DEFAULT_CUSTOMIZATION } from "../templates/customize";
import type { Place } from "../types";

const p = (over: Partial<Place> & { id: string }): Place => ({
  label: over.id,
  fullName: "",
  lat: 0,
  lng: 0,
  affiliation: "visited",
  ...over,
});

function resetStore() {
  usePosterStore.setState({
    home: null,
    places: [],
    units: "km",
    templateId: "vintage-cartography",
    vintageVariant: "classic",
  });
}

describe("posterStore", () => {
  beforeEach(resetStore);

  it("adds and removes places", () => {
    usePosterStore.getState().addPlace(p({ id: "a" }));
    expect(usePosterStore.getState().places).toHaveLength(1);
    usePosterStore.getState().removePlace("a");
    expect(usePosterStore.getState().places).toHaveLength(0);
  });

  it("updates a place by id", () => {
    usePosterStore.getState().addPlace(p({ id: "a", label: "Old" }));
    usePosterStore.getState().updatePlace("a", { label: "New", affiliation: "born" });
    const place = usePosterStore.getState().places[0];
    expect(place.label).toBe("New");
    expect(place.affiliation).toBe("born");
  });

  it("promotes a place to home and demotes the old home into places", () => {
    usePosterStore.setState({
      home: p({ id: "h", label: "Home", affiliation: "lived" }),
      places: [p({ id: "a" })],
    });
    usePosterStore.getState().promoteToHome("a");
    const s = usePosterStore.getState();
    expect(s.home?.id).toBe("a");
    expect(s.places.map((x) => x.id)).toContain("h");
    expect(s.places.map((x) => x.id)).not.toContain("a");
  });

  it("toggles units between km and mi", () => {
    usePosterStore.getState().toggleUnits();
    expect(usePosterStore.getState().units).toBe("mi");
    usePosterStore.getState().toggleUnits();
    expect(usePosterStore.getState().units).toBe("km");
  });

  it("clears places but keeps home", () => {
    usePosterStore.setState({ home: p({ id: "h" }), places: [p({ id: "a" })] });
    usePosterStore.getState().clearPlaces();
    const s = usePosterStore.getState();
    expect(s.home?.id).toBe("h");
    expect(s.places).toHaveLength(0);
  });

  it("resetDesign wipes the design to defaults but keeps display prefs", () => {
    usePosterStore.setState({
      home: p({ id: "h" }),
      places: [p({ id: "a" })],
      units: "mi",
      templateId: "bold-modern",
      addFrame: true,
    });
    usePosterStore.getState().setCustomization({ scaleArrowsByDistance: false });

    usePosterStore.getState().resetDesign();

    const s = usePosterStore.getState();
    expect(s.home).toBeNull();
    expect(s.places).toHaveLength(0);
    expect(s.templateId).toBe(DEFAULT_TEMPLATE_ID);
    expect(s.addFrame).toBe(false);
    expect(s.customization).toEqual(DEFAULT_CUSTOMIZATION);
    expect(s.units).toBe("mi"); // display preference is preserved, not a design field
  });
});
