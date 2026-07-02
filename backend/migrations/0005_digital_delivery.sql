-- 0005_digital_delivery.sql — schema for delivering the $19 digital tier.
--
-- The digital tier is sold but never delivered today: checkout only carries
-- the print-ready PNG (`order_items.asset_url`), and digital-format carts
-- upload no asset at all. Phase B fixes delivery via a post-payment email
-- containing signed links to the full-res PNG and the vector SVG.
--
-- `svg_asset_url` carries the vector asset alongside the existing `asset_url`
-- (PNG) on each order item; `digital_delivered_at` marks when the delivery
-- email was sent, so a webhook retry doesn't re-send it. Safe to re-run
-- (IF NOT EXISTS throughout).

alter table order_items add column if not exists svg_asset_url text;
alter table orders add column if not exists digital_delivered_at timestamptz;
