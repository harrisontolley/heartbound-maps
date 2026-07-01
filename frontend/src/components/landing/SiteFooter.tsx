import Link from "next/link";
import { copy } from "./copy";

/** Closing footer with link columns and copyright. */
export function SiteFooter() {
  const { footer, brand } = copy;
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-6 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
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
            <span className="text-[12px] font-semibold uppercase tracking-[0.96px] text-muted">
              {col.title}
            </span>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[15px] text-body transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[1200px] border-t border-hairline px-6 py-6">
        <p className="text-[14px] text-muted-soft">{footer.copyright}</p>
      </div>
    </footer>
  );
}
