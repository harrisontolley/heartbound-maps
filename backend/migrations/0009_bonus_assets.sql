-- 0009_bonus_assets.sql — columns for the digital-delivery bonus stack: phone
-- and desktop wallpaper renders of the buyer's exact design, captured
-- client-side at add-to-cart alongside the existing PNG/SVG (see
-- PosterStudio.tsx's addToCart, checkout.ts's priceCheckout, and
-- emails/digitalDelivery.ts's "Your bonuses" section).
--
-- Same shape as 0005_digital_delivery.sql's svg_asset_url: a nullable text
-- column on order_items, best-effort (may be absent if the browser upload
-- failed) and never required for an order to proceed. Safe to re-run
-- (IF NOT EXISTS throughout).

alter table order_items add column if not exists phone_wallpaper_asset_url text;
alter table order_items add column if not exists desktop_wallpaper_asset_url text;
