// USD money formatting for the studio's buy flow. Prices are stored as integer
// cents (Stripe convention) so there's no float drift; this is the single place
// that turns them into display strings.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as a US dollar string, e.g. 3900 → "$39.00". */
export function formatUsd(cents: number): string {
  return USD.format(cents / 100);
}
