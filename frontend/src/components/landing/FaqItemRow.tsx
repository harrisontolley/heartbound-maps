"use client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";
import { MailingListForm } from "./MailingListForm";
import type { FaqItem } from "./copy";

/**
 * One FAQ disclosure. Split out from FaqAccordion (a server component) so
 * only this leaf needs client JS, for the onToggle → faq_item_expand capture
 * and for embedding a `formId` widget (e.g. the mailing-list signup) below
 * the answer.
 */
export function FaqItemRow({
  item,
  group,
}: {
  item: Pick<FaqItem, "q" | "a" | "formId">;
  group?: string;
}) {
  const track = useTrackEvent();
  return (
    <details
      className="group border-b border-hairline py-5"
      onToggle={(e) => {
        if (e.currentTarget.open) {
          track(ANALYTICS_EVENTS.faqItemExpand, { question: item.q, group });
        }
      }}
    >
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
      {item.formId === "mailing-list-size" && (
        <div className="max-w-[60ch]">
          <MailingListForm />
        </div>
      )}
    </details>
  );
}
