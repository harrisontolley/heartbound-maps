import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { LinkButton } from "@/components/landing/LinkButton";
import { PRIMARY_CTA, STUDIO_HREF, copy } from "@/components/landing/copy";
import { OG_IMAGE } from "@/lib/seo/site";

const { guarantee } = copy;
const TITLE = guarantee.page.metaTitle;
const DESCRIPTION = guarantee.page.metaDescription;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guarantee" },
  openGraph: {
    type: "website",
    url: "/guarantee",
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
 * Dedicated guarantee page: names the existing damage/fault policy so it can
 * be linked to from buy-decision points (pricing, studio, cart). Scope is
 * unchanged from the FAQ "Returns & changes" group and terms/page.tsx it's
 * sourced from: damaged or flawed prints only, a photo, a free replacement
 * or full refund, nothing to send back. Change-of-mind returns are still
 * excluded because every piece is made to order.
 */
export default function GuaranteePage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />

      <Section>
        <div className="flex flex-col gap-12 md:gap-16">
          <header className="flex max-w-[640px] flex-col items-start gap-4">
            <SectionLabel>{guarantee.eyebrow}</SectionLabel>
            <h1 className="font-display text-title font-normal text-ink">
              {guarantee.headline}
            </h1>
            <p className="text-copy text-body">{guarantee.subhead}</p>
            <LinkButton href={STUDIO_HREF} variant="primary" size="md">
              {PRIMARY_CTA}
            </LinkButton>
          </header>

          <div className="flex max-w-[68ch] flex-col gap-8">
            <div className="flex flex-col gap-3">
              {guarantee.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[16px] leading-[1.6] tracking-[0.16px] text-body"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-hairline pt-6">
              <h2 className="font-display text-[22px] font-normal text-ink">
                What isn&apos;t covered
              </h2>
              <p className="text-[16px] leading-[1.6] tracking-[0.16px] text-body">
                {guarantee.exclusions}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
