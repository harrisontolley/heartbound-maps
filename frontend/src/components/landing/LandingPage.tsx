import { SiteHeader } from "./SiteHeader";
import { Hero } from "./Hero";
import { SocialProofBar } from "./SocialProofBar";
import { Problem } from "./Problem";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { Showcase } from "./Showcase";
import { Testimonials } from "./Testimonials";
import { Pricing } from "./Pricing";
import { FAQ } from "./FAQ";
import { FinalCTA } from "./FinalCTA";
import { SiteFooter } from "./SiteFooter";

/**
 * Marketing landing page for Pinprint. Server-rendered; the only interactive
 * piece (the FAQ) uses native <details>. Every CTA links to the tool at /studio.
 * All copy lives in copy.ts and all media are labeled MediaPlaceholder frames.
 */
export function LandingPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />
      <Hero />
      <SocialProofBar />
      <Problem />
      <Features />
      <HowItWorks />
      <Showcase />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
