import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { LinkButton } from "@/components/landing/LinkButton";

export const metadata: Metadata = {
  title: "Page not found | Heartbound Maps",
};

/** Branded 404: keeps lost visitors on-site with paths back to the good pages. */
export default function NotFound() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />

      <Section>
        <div className="flex max-w-[640px] flex-col items-start gap-4">
          <SectionLabel>404</SectionLabel>
          <h1 className="font-display text-title font-normal text-ink">
            This page is off the map.
          </h1>
          <p className="text-copy text-body">
            The address you followed does not exist. The places that matter are
            still here.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <LinkButton href="/studio" variant="primary" size="md">
              Design your print
            </LinkButton>
            <Link href="/" className="text-copy text-ink underline">
              Back to the homepage
            </Link>
            <Link href="/compare" className="text-copy text-ink underline">
              See how Heartbound Maps compares
            </Link>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
