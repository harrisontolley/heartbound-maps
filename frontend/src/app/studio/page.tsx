import { PosterStudio } from "@/components/PosterStudio";

// The poster-building tool. The marketing landing page lives at `/` and links
// here via every "Create your poster" CTA. PosterStudio carries its own
// "use client"; this route file stays a server component.
export default function StudioPage() {
  return <PosterStudio />;
}
