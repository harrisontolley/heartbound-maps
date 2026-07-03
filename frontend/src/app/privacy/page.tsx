import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";

export const metadata: Metadata = {
  title: "Privacy | Pinprint",
  description:
    "What Pinprint collects, why, and who processes it. Your places are only used to render your artwork.",
  alternates: { canonical: "/privacy" },
};

/**
 * Plain-language privacy policy describing what the product actually does.
 * NOTE: written to match current behaviour; have it reviewed before launch and
 * update it whenever a new integration starts touching personal data.
 */
export default function PrivacyPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />
      <Section>
        <article className="mx-auto flex max-w-[68ch] flex-col gap-8">
          <header className="flex flex-col gap-4">
            <SectionLabel>Legal</SectionLabel>
            <h1 className="font-display text-title font-normal text-ink">
              Privacy policy
            </h1>
            <p className="text-[15px] text-muted">Last updated July 2026.</p>
          </header>

          <Block title="The short version">
            <p>
              We collect what we need to design, print, and deliver your order,
              and nothing more. The places you add are used only to render your
              artwork. We do not sell personal data.
            </p>
          </Block>

          <Block title="What we collect">
            <p>
              The locations you add to a design, including the place you set as
              home. If you create an account: your email address and name. If
              you order: your shipping address and order history. If you request
              a free design export: your email address. Payment card details go
              directly to Stripe, our payment processor. We never see or store
              your card number.
            </p>
          </Block>

          <Block title="How we use it">
            <p>
              Locations render your artwork and are stored with your draft or
              order so you can return to it. Your email is used for receipts,
              tracking links, delivery of digital files, and replies when you
              write to us. Your address is shared with our print partner solely
              to produce and ship your order.
            </p>
          </Block>

          <Block title="Who processes data for us">
            <p>
              Stripe handles payments. Our print partner produces and ships
              physical orders and receives your name, address, and the artwork
              file. Neon hosts our database and sign-in service. Vercel hosts the
              site. PostHog and Vercel Analytics give us aggregate usage
              statistics. Sentry collects error reports so we can fix bugs.
              Resend sends transactional email. Each processes data only to
              provide its service to us.
            </p>
          </Block>

          <Block title="Your choices">
            <p>
              You can design and preview without an account. You can ask us to
              delete your account and its data at any time by writing to
              hello@pinprint.com, and we will keep only what tax and accounting
              law requires us to retain about completed orders.
            </p>
          </Block>

          <Block title="Contact">
            <p>
              Questions about this policy: hello@pinprint.com.
            </p>
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
