"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePosterStore } from "@/lib/store/posterStore";
import type { GeoResult } from "@/lib/types";

function dot(color: string, ring: string): L.DivIcon {
  return L.divIcon({
    className: "pp-pin",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1.5px ${ring}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
const homeIcon = dot("#0c0a09", "rgba(0,0,0,.4)");
const placeIcon = dot("#e4572e", "rgba(0,0,0,.25)");

function ClickToAdd() {
  const addFromGeo = usePosterStore((s) => s.addFromGeo);
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const fallback: GeoResult = {
        id: `${lat},${lng}`,
        label: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
        fullName: "Dropped pin",
        lat,
        lng,
      };
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
        const r = res.ok ? ((await res.json()) as GeoResult | null) : null;
        addFromGeo(r && r.label ? r : fallback);
      } catch {
        addFromGeo(fallback);
      }
    },
  });
  return null;
}

function FitBounds({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(pts);
  useEffect(() => {
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 4);
      return;
    }
    map.fitBounds(pts, { padding: [28, 28], maxZoom: 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function MapPicker() {
  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);

  const pts = useMemo<[number, number][]>(
    () =>
      [...(home ? [home] : []), ...places].map((p) => [p.lat, p.lng]),
    [home, places],
  );
  const center: [number, number] = home ? [home.lat, home.lng] : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={2}
      worldCopyJump
      className="h-full w-full"
      style={{ background: "#aadaff" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <ClickToAdd />
      <FitBounds pts={pts} />
      {home && (
        <Marker position={[home.lat, home.lng]} icon={homeIcon}>
          <Tooltip>{home.label} · home</Tooltip>
        </Marker>
      )}
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={placeIcon}>
          <Tooltip>{p.label}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
