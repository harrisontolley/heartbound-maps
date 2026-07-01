import type { ComparisonRow } from "@/lib/compare/types";

/**
 * At-a-glance comparison: a real <table> (crawlable, accessible) with the Pinprint
 * column tinted and a quiet ✓ on rows where Pinprint has the edge. Row labels are
 * <th scope="row">; the head cells are <th scope="col">. Horizontal scroll kicks
 * in only on very narrow screens so nothing is ever clipped.
 */
export function ComparisonTable({
  rows,
  competitorName,
}: {
  rows: readonly ComparisonRow[];
  competitorName: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-surface-card">
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
              <th
                scope="row"
                className="p-4 font-medium text-body-strong"
              >
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
  );
}
