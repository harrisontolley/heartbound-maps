import { auth } from "@/lib/auth/server";
import { clientIp, enforceLimit } from "@/lib/rateLimit";

// Neon Auth API surface: /api/auth/sign-in, /sign-up, /sign-out, /session, /token,
// /callback/google, … The handler proxies to the Neon Auth service and manages the
// session cookie. This is the one Next.js server route that talks to the auth DB;
// all order/account data still lives behind the Hono backend.
//
// When auth is unconfigured (no env) the routes 503 rather than 500, keeping
// hermetic builds green.
//
// Brute-force protection: only the credential POSTs (sign-in / sign-up) are rate
// limited per IP via Redis. The high-frequency GET /token & /session calls (hit on
// every authenticated request) are deliberately left untouched. With Redis
// unconfigured, enforceLimit allows everything — the 503/normal behaviour is kept.

const handlers = auth?.handler();
const unconfigured = () =>
  new Response("auth not configured", { status: 503 });

const SENSITIVE = /\/(sign-in|sign-up)(\/|$)/;

export const GET = handlers?.GET ?? unconfigured;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const post = handlers?.POST;
  if (!post) return unconfigured();
  if (SENSITIVE.test(new URL(request.url).pathname)) {
    const limited = await enforceLimit(clientIp(request), "auth", {
      max: 10,
      windowMs: 60_000,
    });
    if (limited) return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  return post(request, ctx);
}
