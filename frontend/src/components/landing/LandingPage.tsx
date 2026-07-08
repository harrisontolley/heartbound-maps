import { SiteHeader } from "./SiteHeader";
import { Hero } from "./Hero";
import { TrustLine } from "./TrustLine";
import { HowItWorks } from "./HowItWorks";
import { GlobeDemo } from "./GlobeDemo";
import { CraftSection } from "./CraftSection";
import { StyleGallery } from "./StyleGallery";
import { Stories } from "./Stories";
import { GiftSection } from "./GiftSection";
import { PricingPreview } from "./PricingPreview";
import { FAQ } from "./FAQ";
import { FinalCTA } from "./FinalCTA";
import { SiteFooter } from "./SiteFooter";
import { MobileCtaBar } from "./MobileCtaBar";

/**
 * Marketing landing page for Heartbound Maps. Server-rendered; the interactive pieces
 * (the globe demo, FAQ's native <details>, and the mobile CTA bar) are client
 * islands. Every CTA links to the studio. All copy lives in copy.ts; all
 * imagery is real engine renders or composited lifestyle scenes
 * (scripts/compose-scenes.ts).
 *
 * Order: emotional hook (Hero) → quality facts (TrustLine) → outcomes
 * (Stories: emotive proof of what people actually made) → range
 * (StyleGallery: pick a preset, make it yours) → mechanics (HowItWorks:
 * design free → download free → or printed and shipped free) → authority
 * (GlobeDemo: the accuracy story with the live globe) → materials (Craft) →
 * price (PricingPreview: the value stack and honest pricing, after value is
 * built) → gifting → objections (FAQ) → close (FinalCTA). Emotional proof
 * leads and the price lands late, once the object and the craft have
 * justified the number.
 */
export function LandingPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />
      <Hero />
      <TrustLine />
      <Stories />
      <StyleGallery />
      <HowItWorks />
      <GlobeDemo />
      <CraftSection />
      <PricingPreview />
      <GiftSection />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
      <MobileCtaBar />
    </main>
  );
}
