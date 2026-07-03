import type { ComparisonRow } from "@/lib/compare/types";

/**
 * At-a-glance comparison, rendered twice from the same rows:
 * - `sm` and up: a real <table> (crawlable, accessible) with the Pinprint column
 *   tinted and a quiet ✓ on rows where Pinprint has the edge. Row labels are
 *   <th scope="row">; the head cells are <th scope="col">.
 * - below `sm`: stacked per-attribute cards (a 3-column prose table at phone
 *   width is unreadable; horizontal scroll buries the comparison). The table
 *   stays in the DOM either way, so crawlers always see it.
 */
export function ComparisonTable({
  rows,
  competitorName,
}: {
  rows: readonly ComparisonRow[];
  competitorName: string;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-hairline bg-surface-card sm:block">
        <table className="w-full min-w-[560px] border-collapse text-left align-top text-[15px] leading-[1.5]">
          <caption className="sr-only">
            Pinprint compared with {competitorName}, feature by feature
          </caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="w-[26%] p-4">
                <span className="sr-only">Feature</span>
              </th>
              <th
                scope="col"
                className="w-[37%] bg-canvas-soft p-4 font-display text-[18px] font-normal tracking-[-0.18px] text-ink"
              >
                Pinprint
              </th>
              <th
                scope="col"
                className="w-[37%] p-4 font-display text-[18px] font-normal tracking-[-0.18px] text-ink"
              >
                {competitorName}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.attribute}
                className="border-b border-hairline align-top last:border-b-0"
              >
                <th scope="row" className="p-4 font-medium text-body-strong">
                  {row.attribute}
                </th>
                <td className="bg-canvas-soft p-4 text-body">
                  {row.advantage === "pinprint" && (
                    <span aria-hidden className="mr-1 font-semibold text-success">
                      ✓
                    </span>
                  )}
                  {row.pinprint}
                </td>
                <td className="p-4 text-body">{row.competitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked cards for phones. Exactly one of table/cards is display:none
          at any width, so assistive tech always gets exactly one copy. */}
      <dl className="flex flex-col gap-4 sm:hidden">
        {rows.map((row) => (
          <div
            key={row.attribute}
            className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-4"
          >
            <dt className="text-[12px] font-semibold uppercase tracking-[0.96px] text-muted">
              {row.attribute}
            </dt>
            <dd className="flex flex-col gap-2">
              <div className="rounded-md bg-canvas-soft p-3 text-[15px] leading-[1.5] text-body">
                <span className="mb-0.5 block font-display text-[15px] text-ink">
                  Pinprint
                </span>
                {row.advantage === "pinprint" && (
                  <span aria-hidden className="mr-1 font-semibold text-success">
                    ✓
                  </span>
                )}
                {row.pinprint}
              </div>
              <div className="p-3 pt-1 text-[15px] leading-[1.5] text-body">
                <span className="mb-0.5 block font-display text-[15px] text-ink">
                  {competitorName}
                </span>
                {row.competitor}
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
