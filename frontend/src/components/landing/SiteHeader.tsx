import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/**
 * Top navigation. Wordmark left, in-page anchors center (hidden on mobile via
 * CSS so this stays a server component — no JS menu toggle), CTA always visible
 * on the right. Sticky to keep the action reachable while scrolling.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6">
        <a
          href="#top"
          className="font-display text-2xl font-normal tracking-[-0.32px] text-ink"
        >
          {copy.brand.name}
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {copy.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-body transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <LinkButton href={STUDIO_HREF} variant="primary" size="md">
          {copy.hero.primaryCta}
        </LinkButton>
      </div>
    </header>
  );
}
