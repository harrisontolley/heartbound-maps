/**
 * Presentational FAQ accordion. Native <details>/<summary> so it stays a server
 * component — no client JS for the disclosure behavior. Shared by the landing-page
 * teaser (FAQ.tsx) and the dedicated /faq page, which renders one per category.
 */
export function FaqAccordion({
  items,
}: {
  items: readonly { q: string; a: string }[];
}) {
  return (
    <div className="flex flex-col border-t border-hairline">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-hairline py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-medium text-ink marker:hidden">
            {item.q}
            <span
              aria-hidden
              className="text-muted transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.5] tracking-[0.16px] text-body">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
