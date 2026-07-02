import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { COMPETITORS } from "@/lib/compare/competitors";
import { OG_IMAGE } from "@/lib/seo/site";

const TITLE = "Pinprint vs the alternatives: custom map print comparisons";
const DESCRIPTION =
  "See how Pinprint's measured, multi-place fine art maps stack up against Mapiful, Grafomap, Craft & Oak, Positive Prints and Posterhaste: concept, materials, pricing and shipping, side by side.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  openGraph: {
    type: "website",
    url: "/compare",
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

/** Hub linking to every "Pinprint vs X" page — an indexable surface + link mesh. */
export default function CompareHubPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />

      <Section>
        <div className="flex flex-col gap-12">
          <header className="flex max-w-[680px] flex-col gap-4">
            <SectionLabel>Compare</SectionLabel>
            <h1 className="font-display text-[clamp(2rem,5vw,44px)] font-normal leading-[1.13] tracking-[-0.44px] text-ink">
              How Pinprint compares
            </h1>
            <p className="text-[17px] leading-[1.5] tracking-[0.16px] text-body">
              Most custom-map shops print one place — a single city or street. Pinprint
              maps all the places that matter at once, each drawn in its true compass
              direction from home with the real distance beside it. Here&rsquo;s how it
              lines up against the popular alternatives.
            </p>
          </header>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPETITORS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-hairline bg-surface-card p-6 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                >
                  <span className="font-display text-[20px] font-normal tracking-[-0.2px] text-ink">
                    Pinprint vs {c.name}
                  </span>
                  <span className="text-[15px] leading-[1.5] text-body">
                    {c.oneLiner}
                  </span>
                  <span className="mt-1 text-[14px] font-medium text-ink">
                    Compare →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
