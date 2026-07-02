import { describe, expect, it } from "vitest";
import {
  type BlobEntry,
  type LeadAssetRef,
  type OrderAssetRef,
  orderAssetRefsFromRows,
  selectBlobsToDelete,
  selectFreeBlobsToDelete,
} from "./blobGc.js";

// The deletion decision is the risky part (deleting live artwork would break
// fulfilment / reprints), so the pure selection is tested exhaustively without a
// blob store or DB.

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const OPTS = { orphanTtlMs: 48 * HOUR, retentionMs: 90 * DAY };

function blob(pathname: string, ageMs: number): BlobEntry {
  return {
    pathname,
    url: `https://x.blob.vercel-storage.com/${pathname}`,
    uploadedAt: new Date(NOW - ageMs),
  };
}
function ref(pathname: string, status: string, ageMs: number): OrderAssetRef {
  return {
    assetUrl: `https://x.blob.vercel-storage.com/${pathname}`,
    status,
    createdAt: new Date(NOW - ageMs),
  };
}

describe("selectBlobsToDelete", () => {
  it("keeps a fresh orphan, deletes an old orphan", () => {
    const blobs = [blob("posters/fresh.png", 1 * HOUR), blob("posters/old.png", 72 * HOUR)];
    const out = selectBlobsToDelete(blobs, [], NOW, OPTS);
    expect(out).toEqual([
      { url: blobs[1].url, pathname: "posters/old.png", reason: "orphan" },
    ]);
  });

  it("keeps a blob referenced by a live (non-terminal) order, however old", () => {
    const blobs = [blob("posters/live.png", 365 * DAY)];
    const orders = [ref("posters/live.png", "paid", 365 * DAY)];
    expect(selectBlobsToDelete(blobs, orders, NOW, OPTS)).toEqual([]);
  });

  it("keeps a terminal order still inside the retention window", () => {
    const blobs = [blob("posters/recent.png", 10 * DAY)];
    const orders = [ref("posters/recent.png", "delivered", 10 * DAY)];
    expect(selectBlobsToDelete(blobs, orders, NOW, OPTS)).toEqual([]);
  });

  it("expires a terminal order past the retention window", () => {
    const blobs = [blob("posters/done.png", 120 * DAY)];
    const orders = [ref("posters/done.png", "shipped", 120 * DAY)];
    const out = selectBlobsToDelete(blobs, orders, NOW, OPTS);
    expect(out).toEqual([
      { url: blobs[0].url, pathname: "posters/done.png", reason: "expired" },
    ]);
  });

  it("keeps a blob if ANY referencing order is still live", () => {
    // Same asset reused across two orders: one terminal+old, one still paid.
    const blobs = [blob("posters/shared.png", 200 * DAY)];
    const orders = [
      ref("posters/shared.png", "cancelled", 200 * DAY),
      ref("posters/shared.png", "paid", 5 * DAY),
    ];
    expect(selectBlobsToDelete(blobs, orders, NOW, OPTS)).toEqual([]);
  });

  it("expires only when every referencing order is terminal and old", () => {
    const blobs = [blob("posters/multi.png", 200 * DAY)];
    const orders = [
      ref("posters/multi.png", "refunded", 200 * DAY),
      ref("posters/multi.png", "delivered", 150 * DAY),
    ];
    const out = selectBlobsToDelete(blobs, orders, NOW, OPTS);
    expect(out.map((d) => d.reason)).toEqual(["expired"]);
  });

  // Regression: the digital-delivery SVG asset (order_items.svg_asset_url) must be
  // tracked as a live reference exactly like the PNG (asset_url), or the GC would
  // treat every order's SVG as an orphan and reap it while the order is still live.
  it("keeps an SVG blob referenced by a live order's svg_asset_url, however old", () => {
    const blobs = [blob("posters/live.svg", 365 * DAY)];
    const orders = [ref("posters/live.svg", "paid", 365 * DAY)];
    expect(selectBlobsToDelete(blobs, orders, NOW, OPTS)).toEqual([]);
  });
});

describe("orderAssetRefsFromRows", () => {
  it("expands a row with both asset_url and svg_asset_url into two refs", () => {
    const refs = orderAssetRefsFromRows([
      {
        asset_url: "https://x.blob.vercel-storage.com/posters/a.png",
        svg_asset_url: "https://x.blob.vercel-storage.com/posters/a.svg",
        render_asset_url: null,
        status: "paid",
        created_at: new Date(NOW - DAY).toISOString(),
      },
    ]);
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.assetUrl)).toEqual([
      "https://x.blob.vercel-storage.com/posters/a.png",
      "https://x.blob.vercel-storage.com/posters/a.svg",
    ]);
    expect(refs[0].status).toBe("paid");
    expect(refs[1].status).toBe("paid");
  });

  it("tracks render_asset_url (server print render) as a live ref alongside the others", () => {
    const refs = orderAssetRefsFromRows([
      {
        asset_url: "https://x.blob.vercel-storage.com/posters/a.png",
        svg_asset_url: "https://x.blob.vercel-storage.com/posters/a.svg",
        render_asset_url: "https://x.blob.vercel-storage.com/posters/print-a.png",
        status: "paid",
        created_at: new Date(NOW).toISOString(),
      },
    ]);
    expect(refs.map((r) => r.assetUrl)).toContain(
      "https://x.blob.vercel-storage.com/posters/print-a.png",
    );
    expect(refs).toHaveLength(3);
  });

  it("emits one ref for a row with only asset_url (pre-digital-delivery order)", () => {
    const refs = orderAssetRefsFromRows([
      {
        asset_url: "https://x.blob.vercel-storage.com/posters/legacy.png",
        svg_asset_url: null,
        render_asset_url: null,
        status: "shipped",
        created_at: new Date(NOW).toISOString(),
      },
    ]);
    expect(refs).toEqual([
      { assetUrl: "https://x.blob.vercel-storage.com/posters/legacy.png", status: "shipped", createdAt: refs[0].createdAt },
    ]);
  });

  it("emits one ref for a row with only svg_asset_url", () => {
    const refs = orderAssetRefsFromRows([
      {
        asset_url: null,
        svg_asset_url: "https://x.blob.vercel-storage.com/posters/only.svg",
        render_asset_url: null,
        status: "paid",
        created_at: new Date(NOW).toISOString(),
      },
    ]);
    expect(refs.map((r) => r.assetUrl)).toEqual(["https://x.blob.vercel-storage.com/posters/only.svg"]);
  });

  it("emits nothing for a row with neither asset column set", () => {
    expect(
      orderAssetRefsFromRows([
        { asset_url: null, svg_asset_url: null, render_asset_url: null, status: "paid", created_at: new Date(NOW).toISOString() },
      ]),
    ).toEqual([]);
  });
});

// Free-lead-magnet blobs have no order/terminal-status concept — a lead is just
// (delivered or not). So the rule is simpler than posters/: purge an orphan past
// the (shared) orphan TTL, or purge a referenced blob once its lead is older than
// FREE_ASSET_RETENTION_DAYS, full stop (no "still live" exception).
const FREE_OPTS = { orphanTtlMs: 48 * HOUR, retentionMs: 60 * DAY };

function leadRef(pathname: string, ageMs: number): LeadAssetRef {
  return { assetPathname: pathname, createdAt: new Date(NOW - ageMs) };
}

describe("selectFreeBlobsToDelete", () => {
  it("keeps a fresh orphan, deletes an old orphan", () => {
    const blobs = [blob("free/fresh.png", 1 * HOUR), blob("free/old.png", 72 * HOUR)];
    const out = selectFreeBlobsToDelete(blobs, [], NOW, FREE_OPTS);
    expect(out).toEqual([{ url: blobs[1].url, pathname: "free/old.png", reason: "orphan" }]);
  });

  it("keeps a referenced blob inside the retention window", () => {
    const blobs = [blob("free/recent.png", 10 * DAY)];
    const leads = [leadRef("free/recent.png", 10 * DAY)];
    expect(selectFreeBlobsToDelete(blobs, leads, NOW, FREE_OPTS)).toEqual([]);
  });

  it("expires a referenced blob once its lead is past the retention window", () => {
    const blobs = [blob("free/done.png", 90 * DAY)];
    const leads = [leadRef("free/done.png", 90 * DAY)];
    const out = selectFreeBlobsToDelete(blobs, leads, NOW, FREE_OPTS);
    expect(out).toEqual([{ url: blobs[0].url, pathname: "free/done.png", reason: "expired" }]);
  });

  it("keeps a blob if ANY referencing lead is still inside retention", () => {
    const blobs = [blob("free/shared.png", 90 * DAY)];
    const leads = [leadRef("free/shared.png", 90 * DAY), leadRef("free/shared.png", 5 * DAY)];
    expect(selectFreeBlobsToDelete(blobs, leads, NOW, FREE_OPTS)).toEqual([]);
  });
});
