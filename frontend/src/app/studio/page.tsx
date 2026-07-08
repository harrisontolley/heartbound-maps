import type { Metadata } from "next";
import { PosterStudio } from "@/components/PosterStudio";
import { OG_IMAGE } from "@/lib/seo/site";

const TITLE = "Design a Custom Map Print | Heartbound Maps";
const DESCRIPTION =
  "Design your own map print in about five minutes. Pin the places that matter, pick a style, and preview your personalized fine art print free before you buy.";

// The poster-building tool. The marketing landing page lives at `/` and links
// here via every "Create your poster" CTA. PosterStudio carries its own
// "use client"; this route file stays a server component.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/studio" },
  openGraph: {
    type: "website",
    url: "/studio",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function StudioPage() {
  return <PosterStudio />;
}
