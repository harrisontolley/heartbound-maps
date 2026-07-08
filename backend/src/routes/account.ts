import { Hono } from "hono";
import type { AddressInput, AccountProfilePatch } from "@heartbound/shared";
import { type AuthVariables, requireUser } from "../auth.js";
import {
  createAddress,
  deleteAccountData,
  deleteAddress,
  exportAccount,
  getOrCreateProfile,
  getOrCreateRewards,
  listAddresses,
  updateAddress,
  updateProfile,
} from "../accountStore.js";
import { getOrderForUser, listOrdersForUser } from "../orders.js";

// Authenticated account API. Every route requires a valid Neon Auth session
// (requireUser → 401 when unauthenticated or auth is unconfigured), and all
// queries are scoped to the token's user id — there is no way to read another
// user's data. Returns a fresh router so each of the app's two mounts gets it.

function parseAddress(body: unknown): AddressInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(b.name);
  const line1 = str(b.line1);
  const city = str(b.city);
  const postal = str(b.postal);
  const country = str(b.country);
  if (!name || !line1 || !city || !postal || !country) return null;
  return {
    label: str(b.label) || undefined,
    name,
    line1,
    line2: str(b.line2) || undefined,
    city,
    region: str(b.region) || undefined,
    postal,
    country: country.toUpperCase().slice(0, 2),
    isDefault: b.isDefault === true,
  };
}

function parseProfilePatch(body: unknown): AccountProfilePatch {
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: AccountProfilePatch = {};
  if (typeof b.marketingOptIn === "boolean") patch.marketingOptIn = b.marketingOptIn;
  if (typeof b.orderUpdatesOptIn === "boolean") patch.orderUpdatesOptIn = b.orderUpdatesOptIn;
  if (b.preferredUnits === "km" || b.preferredUnits === "mi") patch.preferredUnits = b.preferredUnits;
  return patch;
}

export function buildAccountRouter(): Hono<{ Variables: AuthVariables }> {
  const r = new Hono<{ Variables: AuthVariables }>();
  r.use("*", requireUser);

  r.get("/profile", async (c) => {
    const user = c.get("user")!;
    return c.json(await getOrCreateProfile(user.userId, user.email));
  });

  r.patch("/profile", async (c) => {
    const user = c.get("user")!;
    const patch = parseProfilePatch(await c.req.json().catch(() => ({})));
    return c.json(await updateProfile(user.userId, patch, user.email));
  });

  r.get("/addresses", async (c) => {
    const user = c.get("user")!;
    return c.json(await listAddresses(user.userId));
  });

  r.post("/addresses", async (c) => {
    const user = c.get("user")!;
    const input = parseAddress(await c.req.json().catch(() => null));
    if (!input) return c.json({ error: "invalid_address" }, 400);
    return c.json(await createAddress(user.userId, input), 201);
  });

  r.patch("/addresses/:id", async (c) => {
    const user = c.get("user")!;
    const input = parseAddress(await c.req.json().catch(() => null));
    if (!input) return c.json({ error: "invalid_address" }, 400);
    const updated = await updateAddress(user.userId, c.req.param("id"), input);
    if (!updated) return c.json({ error: "not_found" }, 404);
    return c.json(updated);
  });

  r.delete("/addresses/:id", async (c) => {
    const user = c.get("user")!;
    const ok = await deleteAddress(user.userId, c.req.param("id"));
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.body(null, 204);
  });

  r.get("/orders", async (c) => {
    const user = c.get("user")!;
    return c.json(await listOrdersForUser(user.userId));
  });

  r.get("/orders/:orderNumber", async (c) => {
    const user = c.get("user")!;
    const order = await getOrderForUser(user.userId, c.req.param("orderNumber"));
    if (!order) return c.json({ error: "not_found" }, 404);
    return c.json(order);
  });

  r.get("/rewards", async (c) => {
    const user = c.get("user")!;
    return c.json(await getOrCreateRewards(user.userId));
  });

  r.post("/export", async (c) => {
    const user = c.get("user")!;
    const bundle = await exportAccount(user.userId, user.email);
    c.header("Content-Disposition", 'attachment; filename="heartbound-account.json"');
    return c.json(bundle);
  });

  r.post("/delete", async (c) => {
    const user = c.get("user")!;
    await deleteAccountData(user.userId);
    return c.json({ ok: true });
  });

  return r;
}
