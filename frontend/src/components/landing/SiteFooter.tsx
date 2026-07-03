import { SectionLabel } from "./SectionLabel";
import { TextLink } from "@/components/ui/TextLink";
import { copy } from "./copy";

/** Closing footer with link columns and copyright. */
export function SiteFooter() {
  const { footer, brand } = copy;
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-3">
          <span className="font-display text-2xl font-normal tracking-[-0.32px] text-ink">
            {brand.name}
          </span>
          <p className="max-w-[28ch] text-[15px] leading-[1.47] text-body">
            {footer.tagline}
          </p>
        </div>

        {footer.columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <SectionLabel>{col.title}</SectionLabel>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <TextLink href={link.href} tone="body">
                    {link.label}
                  </TextLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-page border-t border-hairline py-6">
        <p className="text-[14px] text-muted-soft">{footer.copyright}</p>
      </div>
    </footer>
  );
}
