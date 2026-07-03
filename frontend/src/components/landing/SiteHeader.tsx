import Link from "next/link";
import { LinkButton } from "./LinkButton";
import { MobileNav } from "./MobileNav";
import { AccountNav } from "@/components/account/AccountNav";
import { CartNav } from "@/components/cart/CartNav";
import { TextLink } from "@/components/ui/TextLink";
import { copy, STUDIO_HREF } from "./copy";

/**
 * Top navigation. Wordmark left, in-page anchors center (hidden on mobile via
 * CSS so this stays a server component — no JS menu toggle), CTA always visible
 * on the right. Sticky to keep the action reachable while scrolling.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl font-normal tracking-[-0.32px] text-ink"
        >
          {copy.brand.name}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {copy.nav.links.map((link) => (
            <TextLink
              key={link.href}
              href={link.href}
              tone="body"
              className="font-medium"
            >
              {link.label}
            </TextLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          <CartNav />
          <AccountNav />
          <LinkButton href={STUDIO_HREF} variant="primary" size="md">
            {copy.hero.primaryCta}
          </LinkButton>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
