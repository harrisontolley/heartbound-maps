import { existsSync } from "node:fs";
import { getSql } from "./db.js";
import { createOrder, type NewOrder } from "./orders.js";
import { getOrCreateProfile, getOrCreateRewards, createAddress } from "./accountStore.js";
import type { OrderStatus } from "@heartbound/shared";

// Seeds demonstrable account data: a profile, rewards, a saved address, and a few
// orders in different lifecycle stages with realistic backdated timelines. Lets
// the account UI + public /track be exercised before the real checkout flow ships.
//
//   pnpm --filter @heartbound/backend seed              # attaches to DEMO_USER_ID
//   pnpm --filter @heartbound/backend seed <authUserId> # attach to a signed-in user
//
// Guarded: refuses to run without DATABASE_URL, and in production without DEV_SEED_TOKEN.

if (existsSync(".env")) process.loadEnvFile(".env");

const DEMO_USER_ID = process.argv[2] ?? "demo-user";
const DEMO_EMAIL = "demo@heartboundmaps.com";

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

type Step = { status: OrderStatus | null; message: string; at: string; tracking?: Record<string, string> };

type DemoOrder = {
  base: NewOrder;
  steps: Step[];
  finalStatus: OrderStatus;
  tracking?: { carrier: string; number: string; url: string };
};

const posterConfig = (home: string, places: string[]) => ({
  home: { label: home },
  places: places.map((label) => ({ label })),
  units: "mi",
  bearingMode: "great-circle",
  templateId: "vintage-cartography",
});

const DEMO_ORDERS: DemoOrder[] = [
  {
    base: {
      userId: DEMO_USER_ID,
      email: DEMO_EMAIL,
      status: "pending_payment",
      currency: "usd",
      shippingCents: 0,
      shipping: { name: "Demo Buyer", line1: "10 Downing St", city: "London", postal: "SW1A 2AA", country: "GB" },
      items: [
        {
          productId: "portrait-16x24",
          productLabel: "Portrait 16 × 24 in",
          quantity: 1,
          unitPriceCents: 3900,
          posterConfig: posterConfig("London", ["New York", "Tokyo", "Sydney"]),
        },
      ],
      createdAt: daysAgo(20),
    },
    steps: [
      { status: "paid", message: "Payment received", at: daysAgo(20, 11) },
      { status: "in_production", message: "Sent to the print studio", at: daysAgo(18) },
      { status: "shipped", message: "Shipped via Royal Mail", at: daysAgo(15), tracking: { carrier: "Royal Mail" } },
      { status: "delivered", message: "Delivered", at: daysAgo(12) },
    ],
    finalStatus: "delivered",
    tracking: { carrier: "Royal Mail", number: "RM123456785GB", url: "https://www.royalmail.com/track-your-item#/tracking-results/RM123456785GB" },
  },
  {
    base: {
      userId: DEMO_USER_ID,
      email: DEMO_EMAIL,
      status: "pending_payment",
      currency: "usd",
      shipping: { name: "Demo Buyer", line1: "10 Downing St", city: "London", postal: "SW1A 2AA", country: "GB" },
      items: [
        {
          productId: "square-20x20",
          productLabel: "Square 20 × 20 in",
          quantity: 2,
          unitPriceCents: 4900,
          posterConfig: posterConfig("London", ["Paris", "Rome"]),
        },
      ],
      createdAt: daysAgo(4),
    },
    steps: [
      { status: "paid", message: "Payment received", at: daysAgo(4, 11) },
      { status: "in_production", message: "Sent to the print studio", at: daysAgo(2) },
    ],
    finalStatus: "in_production",
  },
  {
    base: {
      userId: DEMO_USER_ID,
      email: DEMO_EMAIL,
      status: "pending_payment",
      currency: "usd",
      shipping: { name: "Demo Buyer", line1: "10 Downing St", city: "London", postal: "SW1A 2AA", country: "GB" },
      items: [
        {
          productId: "landscape-24x16",
          productLabel: "Landscape 24 × 16 in",
          quantity: 1,
          unitPriceCents: 3900,
          posterConfig: posterConfig("Edinburgh", ["Reykjavik", "Oslo"]),
        },
      ],
      createdAt: daysAgo(0),
    },
    steps: [],
    finalStatus: "pending_payment",
  },
];

async function main(): Promise<void> {
  const sql = getSql();
  if (!sql) {
    console.log("[seed] DATABASE_URL unset — nothing to seed.");
    return;
  }
  if (process.env.NODE_ENV === "production" && !process.env.DEV_SEED_TOKEN) {
    console.log("[seed] refusing to seed in production without DEV_SEED_TOKEN.");
    return;
  }

  await getOrCreateProfile(DEMO_USER_ID, DEMO_EMAIL, "Demo Buyer");
  await getOrCreateRewards(DEMO_USER_ID);
  await createAddress(DEMO_USER_ID, {
    label: "Home",
    name: "Demo Buyer",
    line1: "10 Downing St",
    city: "London",
    postal: "SW1A 2AA",
    country: "GB",
    isDefault: true,
  });

  const created: string[] = [];
  for (const demo of DEMO_ORDERS) {
    const { id, orderNumber } = await createOrder(demo.base);
    for (const step of demo.steps) {
      await sql`
        insert into order_events (order_id, status, message, source, created_at)
        values (${id}, ${step.status}, ${step.message}, 'system', ${step.at})
      `;
    }
    const t = demo.tracking;
    await sql`
      update orders set
        status = ${demo.finalStatus},
        tracking_carrier = ${t?.carrier ?? null},
        tracking_number = ${t?.number ?? null},
        tracking_url = ${t?.url ?? null},
        updated_at = now()
      where id = ${id}
    `;
    created.push(orderNumber);
  }

  console.log(`[seed] done. user_id="${DEMO_USER_ID}", email="${DEMO_EMAIL}"`);
  console.log(`[seed] orders: ${created.join(", ")}`);
  console.log(`[seed] try /track with one of those order numbers + ${DEMO_EMAIL}`);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
