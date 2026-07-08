import { randomInt } from "node:crypto";
import type {
  AccountProfile,
  AccountProfilePatch,
  AccountUnits,
  Address,
  AddressInput,
  RewardEvent,
  Rewards,
} from "@heartbound/shared";
import { getSql } from "./db.js";
import { listOrdersForUser, getOrderForUser } from "./orders.js";

// Profile, saved addresses, and the display-only rewards scaffold. Keyed by the
// Neon Auth user id (plain text — no FK into neon_auth). Env-guarded: with no
// DATABASE_URL, reads return sensible empties and writes throw a clear error.

const REFERRAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function referralCode(): string {
  let s = "";
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) s += "-";
    s += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  }
  return s;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL not configured");
  return sql;
}

// ── Profile ──────────────────────────────────────────────────────────────────
type ProfileRow = {
  user_id: string;
  marketing_opt_in: boolean;
  order_updates_opt_in: boolean;
  preferred_units: string;
};

function mapProfile(row: ProfileRow, email?: string, name?: string): AccountProfile {
  return {
    userId: row.user_id,
    email,
    name,
    marketingOptIn: row.marketing_opt_in,
    orderUpdatesOptIn: row.order_updates_opt_in,
    preferredUnits: (row.preferred_units === "km" ? "km" : "mi") as AccountUnits,
  };
}

/** Read the profile, creating a default row on first access. */
export async function getOrCreateProfile(
  userId: string,
  email?: string,
  name?: string,
): Promise<AccountProfile> {
  const sql = requireSql();
  const rows = (await sql`
    insert into user_profiles (user_id) values (${userId})
    on conflict (user_id) do update set updated_at = now()
    returning *
  `) as unknown as ProfileRow[];
  return mapProfile(rows[0], email, name);
}

export async function updateProfile(
  userId: string,
  patch: AccountProfilePatch,
  email?: string,
  name?: string,
): Promise<AccountProfile> {
  const sql = requireSql();
  await getOrCreateProfile(userId);
  const units = patch.preferredUnits ?? null;
  const rows = (await sql`
    update user_profiles set
      marketing_opt_in = coalesce(${patch.marketingOptIn ?? null}, marketing_opt_in),
      order_updates_opt_in = coalesce(${patch.orderUpdatesOptIn ?? null}, order_updates_opt_in),
      preferred_units = coalesce(${units}, preferred_units),
      updated_at = now()
    where user_id = ${userId}
    returning *
  `) as unknown as ProfileRow[];
  return mapProfile(rows[0], email, name);
}

/**
 * Whether a signed-in user wants shipped/delivered order-update emails
 * (backend/src/orderEmails.ts). Read-only and lighter than
 * `getOrCreateProfile` — it doesn't insert a default row for a user who's
 * never touched their profile settings, since this is called from a
 * background send (webhook/cron), not a page load. Defaults to `true` for a
 * user with no row yet, matching `user_profiles.order_updates_opt_in`'s own
 * column default (0001_init.sql) and the DB-unconfigured/no-key fallback.
 */
export async function getOrderUpdatesOptIn(userId: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return true;
  const rows = (await sql`
    select order_updates_opt_in from user_profiles where user_id = ${userId} limit 1
  `) as unknown as { order_updates_opt_in: boolean }[];
  return rows[0]?.order_updates_opt_in ?? true;
}

// ── Addresses ────────────────────────────────────────────────────────────────
type AddressRow = {
  id: string;
  label: string | null;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal: string;
  country: string;
  is_default: boolean;
};

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label ?? undefined,
    name: row.name,
    line1: row.line1,
    line2: row.line2 ?? undefined,
    city: row.city,
    region: row.region ?? undefined,
    postal: row.postal,
    country: row.country,
    isDefault: row.is_default,
  };
}

export async function listAddresses(userId: string): Promise<Address[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    select * from addresses where user_id = ${userId}
    order by is_default desc, created_at desc
  `) as unknown as AddressRow[];
  return rows.map(mapAddress);
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  const sql = requireSql();
  if (input.isDefault) {
    await sql`update addresses set is_default = false where user_id = ${userId}`;
  }
  const rows = (await sql`
    insert into addresses (user_id, label, name, line1, line2, city, region, postal, country, is_default)
    values (${userId}, ${input.label ?? null}, ${input.name}, ${input.line1}, ${input.line2 ?? null},
            ${input.city}, ${input.region ?? null}, ${input.postal}, ${input.country}, ${input.isDefault ?? false})
    returning *
  `) as unknown as AddressRow[];
  return mapAddress(rows[0]);
}

export async function updateAddress(
  userId: string,
  id: string,
  input: AddressInput,
): Promise<Address | null> {
  const sql = requireSql();
  if (input.isDefault) {
    await sql`update addresses set is_default = false where user_id = ${userId}`;
  }
  const rows = (await sql`
    update addresses set
      label = ${input.label ?? null}, name = ${input.name}, line1 = ${input.line1},
      line2 = ${input.line2 ?? null}, city = ${input.city}, region = ${input.region ?? null},
      postal = ${input.postal}, country = ${input.country}, is_default = ${input.isDefault ?? false},
      updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning *
  `) as unknown as AddressRow[];
  return rows[0] ? mapAddress(rows[0]) : null;
}

export async function deleteAddress(userId: string, id: string): Promise<boolean> {
  const sql = requireSql();
  const rows = (await sql`
    delete from addresses where id = ${id} and user_id = ${userId} returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

// ── Rewards (display-only) ───────────────────────────────────────────────────
type RewardsRow = {
  user_id: string;
  points_balance: number;
  credit_cents: number;
  referral_code: string;
};
type RewardEventRow = {
  kind: string;
  points: number;
  credit_cents: number;
  description: string;
  created_at: string;
};

/** Read rewards, seeding a welcome bonus + referral code on first access. */
export async function getOrCreateRewards(userId: string): Promise<Rewards> {
  const sql = requireSql();
  const existing = (await sql`
    select * from rewards where user_id = ${userId} limit 1
  `) as unknown as RewardsRow[];

  let row = existing[0];
  if (!row) {
    const created = (await sql`
      insert into rewards (user_id, points_balance, credit_cents, referral_code)
      values (${userId}, 100, 0, ${referralCode()})
      on conflict (user_id) do update set updated_at = now()
      returning *
    `) as unknown as RewardsRow[];
    row = created[0];
    await sql`
      insert into reward_events (user_id, kind, points, credit_cents, description)
      values (${userId}, 'signup_bonus', 100, 0, 'Welcome bonus for joining Heartbound Maps')
    `;
  }

  const events = (await sql`
    select kind, points, credit_cents, description, created_at
    from reward_events where user_id = ${userId} order by created_at desc
  `) as unknown as RewardEventRow[];

  return {
    pointsBalance: row.points_balance,
    creditCents: row.credit_cents,
    referralCode: row.referral_code,
    ledger: events.map(
      (e): RewardEvent => ({
        kind: (["signup_bonus", "referral", "order_credit", "promo"].includes(e.kind)
          ? e.kind
          : "promo") as RewardEvent["kind"],
        points: e.points,
        creditCents: e.credit_cents,
        description: e.description,
        createdAt: new Date(e.created_at).toISOString(),
      }),
    ),
  };
}

// ── GDPR: export + delete ────────────────────────────────────────────────────
export async function exportAccount(userId: string, email?: string, name?: string) {
  const profile = await getOrCreateProfile(userId, email, name);
  const addresses = await listAddresses(userId);
  const rewards = await getOrCreateRewards(userId);
  const summaries = await listOrdersForUser(userId);
  const orders = await Promise.all(
    summaries.map((s) => getOrderForUser(userId, s.orderNumber)),
  );
  return {
    exportedAt: new Date().toISOString(),
    profile,
    addresses,
    rewards,
    orders: orders.filter(Boolean),
  };
}

/**
 * Clear app-owned personal data for a user: delete addresses/profile/rewards and
 * disassociate (but retain) orders for financial record-keeping. Deleting the
 * auth identity itself is a separate Neon Auth action triggered from the client.
 */
export async function deleteAccountData(userId: string): Promise<void> {
  const sql = requireSql();
  await sql`update orders set user_id = null where user_id = ${userId}`;
  await sql`delete from addresses where user_id = ${userId}`;
  await sql`delete from reward_events where user_id = ${userId}`;
  await sql`delete from rewards where user_id = ${userId}`;
  await sql`delete from user_profiles where user_id = ${userId}`;
}
