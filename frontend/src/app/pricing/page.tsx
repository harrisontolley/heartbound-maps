import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { LinkButton } from "@/components/landing/LinkButton";
import { PricingLadder } from "@/components/pricing/PricingLadder";
import { PRIMARY_CTA, STUDIO_HREF } from "@/components/landing/copy";
import { OG_IMAGE } from "@/lib/seo/site";

const TITLE = "Pricing | Pinprint";
const DESCRIPTION =
  "Three sizes on Hahnemühle 310gsm fine art paper, framed or unframed, plus a digital download. Free US shipping, and every order includes the files.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
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

/** Dedicated pricing page: the full ladder plus material and policy facts. */
export default function PricingPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />

      <Section>
        <div className="flex flex-col gap-12 md:gap-16">
          <header className="flex max-w-[640px] flex-col items-start gap-4">
            <SectionLabel>Pricing</SectionLabel>
            <h1 className="font-display text-title font-normal text-ink">
              Priced like the object it is.
            </h1>
            <p className="text-copy text-body">
              The same artwork at every size, on the same paper. Designing is
              free. You choose a size and whether it arrives framed.
            </p>
            <LinkButton href={STUDIO_HREF} variant="primary" size="md">
              {PRIMARY_CTA}
            </LinkButton>
          </header>

          <PricingLadder />
        </div>
      </Section>

      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
