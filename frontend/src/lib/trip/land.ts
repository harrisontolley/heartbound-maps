import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import type { Vec2 } from "../geo/projection";

type Position = [number, number];

interface MinimalGeometry {
  type: string;
  coordinates: unknown;
}
interface MinimalFeatureCollection {
  features: { geometry: MinimalGeometry }[];
}

let cachedRings: Position[][] | null = null;

/** Outer + inner rings of every landmass as [lng, lat] positions. Decoded once. */
function landRings(): Position[][] {
  if (cachedRings) return cachedRings;

  const fc = feature(
    landTopology as never,
    landTopology.objects.land as never,
  ) as unknown as MinimalFeatureCollection;

  const rings: Position[][] = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (g.type === "Polygon") {
      for (const ring of g.coordinates as Position[][]) rings.push(ring);
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates as Position[][][])
        for (const ring of poly) rings.push(ring);
    }
  }
  cachedRings = rings;
  return rings;
}

/**
 * SVG path `d` for all land, projected through `project`. One subpath per ring;
 * render with fill-rule="evenodd" so polygon holes (inland seas) read as gaps.
 */
export function landPathData(
  project: (lng: number, lat: number) => Vec2,
): string {
  let d = "";
  for (const ring of landRings()) {
    for (let i = 0; i < ring.length; i++) {
      const p = project(ring[i][0], ring[i][1]);
      d += `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`;
    }
    d += "Z";
  }
  return d;
}

function round(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
