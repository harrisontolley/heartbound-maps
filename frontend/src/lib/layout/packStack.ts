/**
 * Non-decreasing least-squares isotonic regression (pool-adjacent-violators).
 * Returns the closest non-decreasing sequence to `t`. O(n).
 */
export function pava(t: number[]): number[] {
  const blocks: { sum: number; count: number; val: number }[] = [];
  for (const v of t) {
    const b = { sum: v, count: 1, val: v };
    while (blocks.length && blocks[blocks.length - 1].val >= b.val) {
      const p = blocks.pop()!;
      b.sum += p.sum;
      b.count += p.count;
      b.val = b.sum / b.count;
    }
    blocks.push(b);
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.count; k++) out.push(b.val);
  return out;
}

/**
 * Pack a vertical stack of label centers. Given each member's desired center
 * `targets[i]` (top→bottom), the minimum center-to-center gap `gaps[i]` between
 * consecutive members, and their `heights`, return centers `y[i]` that are:
 *  - strictly ordered with every gap satisfied (so the boxes never overlap), and
 *  - as close to the targets as possible (isotonic L2 fit), then
 *  - rigidly shifted so the stack's top/bottom edges fit within `[lo, hi]`.
 * If the stack is taller than `hi-lo` it is top-aligned (bottom overflow handled by
 * the caller's clamp/cleanup). Pure + deterministic.
 *
 * The isotonic fit is what makes conflicts "split the difference": two labels
 * fighting for the same slot each move half the deficit rather than one label
 * absorbing the whole displacement.
 */
export function packStackVertical(
  targets: number[],
  gaps: number[],
  heights: number[],
  lo: number,
  hi: number,
): number[] {
  const n = targets.length;
  if (n === 0) return [];
  const prefix = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) prefix[i] = prefix[i - 1] + gaps[i - 1];
  // Substitute z_i = y_i - prefix_i so the gap constraints become z non-decreasing.
  const z = pava(targets.map((t, i) => t - prefix[i]));
  const y = z.map((zi, i) => zi + prefix[i]);
  // Rigid block-shift so the stack's outer edges fit within [lo, hi].
  const topEdge = y[0] - heights[0] / 2;
  const botEdge = y[n - 1] + heights[n - 1] / 2;
  const lowShift = lo - topEdge; // shift ≥ this keeps the top edge inside
  const highShift = hi - botEdge; // shift ≤ this keeps the bottom edge inside
  const shift =
    lowShift <= highShift ? Math.min(Math.max(0, lowShift), highShift) : lowShift; // too tall → top-align
  return y.map((v) => v + shift);
}
