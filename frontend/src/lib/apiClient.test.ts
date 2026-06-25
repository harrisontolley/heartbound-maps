import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// apiClient mints the backend JWT from Neon Auth's /api/auth/token endpoint, then
// attaches it as a Bearer header on backend calls. Drive both via the fetch mock.
import { apiFetch } from "./apiClient";

// The token mint and the backend call both go through fetch — match on URL rather
// than assuming call order.
function initFor(
  spy: ReturnType<typeof vi.spyOn>,
  path: string,
): RequestInit | undefined {
  const call = spy.mock.calls.find((c: unknown[]) => String(c[0]).includes(path));
  return call?.[1] as RequestInit | undefined;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mints a token from /api/auth/token and attaches it as a Bearer header", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/api/auth/token")
        ? new Response(JSON.stringify({ token: "jwt-123" }))
        : new Response("{}"),
    );
    await apiFetch("/account/orders");
    const headers = new Headers(initFor(spy, "/account/orders")?.headers);
    expect(headers.get("authorization")).toBe("Bearer jwt-123");
  });

  it("omits Authorization when the token endpoint says signed out", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/api/auth/token")
        ? new Response("unauthorized", { status: 401 })
        : new Response("{}"),
    );
    await apiFetch("/account/orders");
    const headers = new Headers(initFor(spy, "/account/orders")?.headers);
    expect(headers.get("authorization")).toBeNull();
  });
});
