import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { copy } from "@/components/landing/copy";
import { OG_IMAGE } from "@/lib/seo/site";

const { hangingGuide } = copy;
const TITLE = hangingGuide.page.metaTitle;
const DESCRIPTION = hangingGuide.page.metaDescription;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/hanging-guide" },
  openGraph: {
    type: "website",
    url: "/hanging-guide",
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

/**
 * Static hanging/care guide: linked from the post-payment digital-delivery
 * email (so it lands after a buyer's print ships) and the footer. Content is
 * practical and verifiable only: standard gallery hanging height, sensible
 * wall placement, the two frame materials actually offered, and basic
 * archival paper care. No purchase decision lives here.
 */
export default function HangingGuidePage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />

      <Section>
        <div className="flex flex-col gap-12 md:gap-16">
          <header className="flex max-w-[640px] flex-col items-start gap-4">
            <SectionLabel>{hangingGuide.eyebrow}</SectionLabel>
            <h1 className="font-display text-title font-normal text-ink">
              {hangingGuide.headline}
            </h1>
            <p className="text-copy text-body">{hangingGuide.subhead}</p>
          </header>

          <div className="flex max-w-[68ch] flex-col gap-8">
            {hangingGuide.sections.map((section) => (
              <div
                key={section.title}
                className="flex flex-col gap-3 border-t border-hairline pt-6 first:border-t-0 first:pt-0"
              >
                <h2 className="font-display text-[22px] font-normal text-ink">
                  {section.title}
                </h2>
                <p className="text-[16px] leading-[1.6] tracking-[0.16px] text-body">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
