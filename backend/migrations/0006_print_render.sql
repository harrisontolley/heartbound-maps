-- Phase C: server-side 300-DPI print rendering.
-- Each order line item gains a column for the exact-DPI PNG the backend renders
-- from the stored SVG at fulfilment time (posters/print-<order>-<idx>.png). It's
-- a live blob reference for GC (see orderAssetRefsFromRows) and lets a re-run or
-- reprint reuse the render instead of re-rasterizing (idempotency).
alter table order_items add column if not exists render_asset_url text;
