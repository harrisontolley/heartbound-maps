import { LandingPage } from "@/components/landing/LandingPage";

// Marketing landing page. The poster-building tool lives at /studio.
// The founding-price line in PricingPreview is baked in at render; revalidate
// hourly so it stops showing shortly after FOUNDING_PRICES_END_ISO passes.
export const revalidate = 3600;

export default function Home() {
  return <LandingPage />;
}
