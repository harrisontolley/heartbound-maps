import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";

export const metadata: Metadata = {
  title: "Terms | Pinprint",
  description:
    "The terms for designing, ordering, and receiving a Pinprint: made to order, damage replaced free, no change-of-mind returns.",
  alternates: { canonical: "/terms" },
};

/**
 * Plain-language terms matching current product behaviour. NOTE: have this
 * reviewed before launch; it is intentionally short and honest rather than
 * exhaustive boilerplate.
 */
export default function TermsPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />
      <Section>
        <article className="mx-auto flex max-w-[68ch] flex-col gap-8">
          <header className="flex flex-col gap-4">
            <SectionLabel>Legal</SectionLabel>
            <h1 className="font-display text-[clamp(2rem,5vw,44px)] font-normal leading-[1.1] text-ink">
              Terms of service
            </h1>
            <p className="text-[15px] text-muted">Last updated July 2026.</p>
          </header>

          <Block title="The service">
            <p>
              Pinprint lets you design a custom map print and order it as a
              physical print, a framed print, or a digital download. Designing
              and previewing are free. You pay only when you order.
            </p>
          </Block>

          <Block title="Orders and delivery">
            <p>
              Every print is made to order. Production takes 2 to 3 business
              days and most US orders arrive within 5 to 10 business days.
              Shipping within the United States is free. We currently ship only
              to US addresses. You can update or cancel an order until it enters
              production; after that it is locked in.
            </p>
          </Block>

          <Block title="Returns and replacements">
            <p>
              Because each piece is printed from your own design, we cannot
              accept change-of-mind returns. If your print arrives damaged or
              has a production fault, email a photo to hello@pinprint.com and we
              will send a free replacement or refund you in full. You do not
              need to return the original.
            </p>
          </Block>

          <Block title="Your design and our artwork">
            <p>
              The places and names you enter stay yours. The rendered artwork,
              map engine, styles, and site are ours. A purchase, physical or
              digital, gives you a personal, non-commercial licence to print and
              display the artwork. It does not permit resale of the design or
              the files.
            </p>
          </Block>

          <Block title="Accounts and fair use">
            <p>
              You are responsible for activity under your account. We may
              refuse or cancel orders that abuse the service, and we will refund
              anything cancelled on our side that you have already paid for.
            </p>
          </Block>

          <Block title="Liability">
            <p>
              We stand behind the product: faulty or damaged prints are replaced
              or refunded. Beyond that, our liability for any claim is limited
              to the amount you paid for the order concerned.
            </p>
          </Block>

          <Block title="Contact">
            <p>Questions about these terms: hello@pinprint.com.</p>
          </Block>
        </article>
      </Section>
      <SiteFooter />
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-hairline pt-6">
      <h2 className="font-display text-[22px] font-normal text-ink">{title}</h2>
      <div className="flex flex-col gap-3 text-[16px] leading-[1.6] tracking-[0.16px] text-body">
        {children}
      </div>
    </section>
  );
}
