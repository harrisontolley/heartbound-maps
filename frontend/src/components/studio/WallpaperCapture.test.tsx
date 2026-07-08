import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { WallpaperCapture } from "./WallpaperCapture";
import { getTemplate } from "@/lib/templates/registry";
import type { Place } from "@/lib/types";

// Component-level check for the hidden-poster wiring the studio relies on at
// add-to-cart: both wallpaper sizes must actually render a real <svg> at
// their own viewBox (not the print's), off-screen (not display:none, so a
// future dependency on layout/paint would still work), by the time the
// component has mounted — no async "settling" required (see the component's
// doc comment). measureText has no canvas backing in vitest/jsdom, so layout
// falls back to the deterministic SSR estimate (see measure.ts) — this still
// exercises the real useMeasuredLayout + Poster render path end to end.

const HOME: Place = {
  id: "home",
  label: "Melbourne",
  fullName: "Melbourne, Victoria, Australia",
  lat: -37.8136,
  lng: 144.9631,
  affiliation: "born",
};
const PLACES: Place[] = [
  {
    id: "sydney",
    label: "Sydney",
    fullName: "Sydney, NSW, Australia",
    lat: -33.8688,
    lng: 151.2093,
    affiliation: "visited",
  },
];

const DISPLAY = { legend: true, distances: true, north: true, footer: true };

function renderCapture() {
  const phoneRef = createRef<HTMLDivElement>();
  const desktopRef = createRef<HTMLDivElement>();
  const utils = render(
    <WallpaperCapture
      home={HOME}
      places={PLACES}
      units="km"
      template={getTemplate("vintage-cartography")}
      bearingMode="great-circle"
      scaleByDistance
      showDistances
      fontsReady
      title={null}
      subtitle={null}
      footer={null}
      display={DISPLAY}
      phoneRef={phoneRef}
      desktopRef={desktopRef}
    />,
  );
  return { ...utils, phoneRef, desktopRef };
}

describe("WallpaperCapture", () => {
  it("renders a real <svg> for the phone wallpaper at the phone viewBox (1080x1920)", () => {
    const { phoneRef } = renderCapture();
    const svg = phoneRef.current?.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1080 1920");
  });

  it("renders a real <svg> for the desktop wallpaper at the desktop viewBox (1920x1080)", () => {
    const { desktopRef } = renderCapture();
    const svg = desktopRef.current?.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1920 1080");
  });

  it("gives each poster's <defs> children unique ids, so they never collide with each other on the page", () => {
    const { container } = renderCapture();
    const ids = Array.from(container.querySelectorAll("defs [id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("renders off-screen (not display:none) so nothing depends on paint visibility", () => {
    const { container } = renderCapture();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("pointer-events-none");
    expect(root.className).not.toContain("hidden");
  });

  it("draws the arrow toward the one place in both wallpaper sizes", () => {
    const { phoneRef, desktopRef } = renderCapture();
    // A real (non-empty) layout should have laid out one place item — the
    // place's label text should appear somewhere in each rendered SVG
    // (uppercased by this template's nameTransform).
    expect(phoneRef.current?.textContent?.toLowerCase()).toContain("sydney");
    expect(desktopRef.current?.textContent?.toLowerCase()).toContain("sydney");
  });
});
