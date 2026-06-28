import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

// Neon Auth session verification. Neon Auth (Better Auth) runs in the Next.js app;
// this separate Hono service trusts a request only via a Bearer JWT that it
// verifies offline against Neon Auth's JWKS — no shared secret, works the same
// cross-origin in local dev (where the auth cookie is NOT sent to :8787) as it
// does same-origin in production. Env-guarded: with NEON_AUTH_JWKS_URL unset the
// middleware fails clean (401), so routes still register and tests stay hermetic.

export type AuthUser = { userId: string; email?: string; emailVerified?: boolean };
export type AuthVariables = { user: AuthUser | null };

type KeyResolver = ReturnType<typeof createRemoteJWKSet>;
let keyResolver: KeyResolver | null = null;

function getKeyResolver(): KeyResolver | null {
  if (keyResolver) return keyResolver;
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) return null;
  keyResolver = createRemoteJWKSet(new URL(url));
  return keyResolver;
}

/** Test seam: inject a local JWKS resolver (e.g. jose.createLocalJWKSet). */
export function __setAuthKeyResolverForTests(resolver: KeyResolver | null): void {
  keyResolver = resolver;
}

/** True when the backend can verify session tokens. */
export function isAuthConfigured(): boolean {
  return Boolean(keyResolver) || Boolean(process.env.NEON_AUTH_JWKS_URL);
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  const resolver = getKeyResolver();
  if (!resolver) return null;
  try {
    const issuer = process.env.NEON_AUTH_ISSUER || undefined;
    const { payload } = await jwtVerify(token, resolver, issuer ? { issuer } : {});
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    if (!userId) return null;
    const email = typeof payload.email === "string" ? payload.email : undefined;
    // Better Auth / Neon Auth may emit either casing; treat a missing claim as
    // unknown (undefined), an explicit false as unverified (blocks admin).
    const ev = payload.email_verified ?? (payload as Record<string, unknown>).emailVerified;
    const emailVerified = typeof ev === "boolean" ? ev : undefined;
    return { userId, email, emailVerified };
  } catch {
    return null;
  }
}

function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

/** Populate c.var.user when a valid token is present; never blocks the request. */
export const getUser: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const token = bearerToken(c.req.header("authorization"));
  c.set("user", token ? await verifyToken(token) : null);
  await next();
};

/** 401 unless a valid token resolves to a user. Honest about unconfigured state. */
export const requireUser: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  if (!isAuthConfigured()) return c.json({ error: "auth_unconfigured" }, 401);
  const token = bearerToken(c.req.header("authorization"));
  const user = token ? await verifyToken(token) : null;
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("user", user);
  await next();
};

/** Parsed, lower-cased ADMIN_EMAILS allowlist (comma/space separated). */
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when an admin allowlist is configured (no allowlist ⇒ admin is closed). */
export function isAdminConfigured(): boolean {
  return adminEmails().size > 0;
}

/**
 * Whether a user's email is on the admin allowlist. Requires the email to not be
 * explicitly unverified — so an attacker can't escalate by setting their account
 * email to a known admin address without proving ownership. (A missing
 * `email_verified` claim is treated as unknown and allowed; ensure Neon Auth
 * requires re-verification on email change — see docs/admin.md.)
 */
export function isAdminUser(user: AuthUser | null): boolean {
  if (!user?.email) return false;
  if (user.emailVerified === false) return false;
  return adminEmails().has(user.email.toLowerCase());
}

/**
 * 403 unless a valid session resolves to a user whose email is on ADMIN_EMAILS.
 * Admin is gated by a server-side env allowlist on top of normal auth — the
 * client is never trusted. With no allowlist (or auth unconfigured) admin is
 * closed (403), so it can't be left accidentally open.
 */
export const requireAdmin: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  if (!isAuthConfigured()) return c.json({ error: "auth_unconfigured" }, 401);
  const token = bearerToken(c.req.header("authorization"));
  const user = token ? await verifyToken(token) : null;
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!isAdminUser(user)) return c.json({ error: "forbidden" }, 403);
  c.set("user", user);
  await next();
};
