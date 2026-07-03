import { FaqItemRow } from "./FaqItemRow";
import type { FaqItem } from "./copy";

/**
 * Presentational FAQ accordion. Stays a server component itself — each
 * question renders through the small client `FaqItemRow` so only the disclosure
 * interaction (and its faq_item_expand tracking) needs client JS. Shared by
 * the landing-page teaser (FAQ.tsx) and the dedicated /faq page, which renders
 * one accordion per category (passing `group` for that category's items).
 */
export function FaqAccordion({
  items,
  group,
}: {
  items: readonly (Pick<FaqItem, "q" | "a" | "formId"> & { group?: string })[];
  group?: string;
}) {
  return (
    <div className="flex flex-col border-t border-hairline">
      {items.map((item) => (
        <FaqItemRow key={item.q} item={item} group={item.group ?? group} />
      ))}
    </div>
  );
}
