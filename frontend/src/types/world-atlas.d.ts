// Minimal typing for the bundled Natural Earth land outline. The real shape is
// a TopoJSON Topology; we only ever hand it to topojson-client's feature(), so a
// loose declaration keeps tsc fast (no 55 KB JSON literal-type inference).
declare module "world-atlas/land-110m.json" {
  const topology: {
    type: "Topology";
    objects: { land: unknown };
    arcs: number[][][];
    transform?: { scale: [number, number]; translate: [number, number] };
    bbox?: number[];
  };
  export default topology;
}
