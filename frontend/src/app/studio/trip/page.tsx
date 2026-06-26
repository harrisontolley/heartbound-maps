import type { Metadata } from "next";
import { TripStudio } from "@/components/trip/TripStudio";

export const metadata: Metadata = {
  title: "Trip map — Pinprint",
  description: "Design a world-map poster of a trip, stop by stop.",
};

// Standalone trip-map playground. TripStudio carries its own "use client"; this
// route file stays a server component, mirroring app/studio/page.tsx.
export default function TripPage() {
  return <TripStudio />;
}
