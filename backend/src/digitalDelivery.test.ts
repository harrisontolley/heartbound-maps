import { beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors fulfillment.ts's shape (never throws, idempotent, env-guarded,
// order_events logging), but with a claim/release pair from orders.ts as the
// idempotency guard instead of a single "already submitted" read, since a
// digital-delivery email — unlike an Artelo submission — has no external
// side-effect to check for prior existence. DB + Resend are mocked (see
// routes/leads.test.ts for precedent), so the module is tested against a
// simulated store rather than a real Neon connection.

const getOrderForDigitalDelivery = vi.fn();
const claimDigitalDelivery = vi.fn();
const releaseDigitalDeliveryClaim = vi.fn(() => Promise.resolve());
const appendOrderEvent = vi.fn(() => Promise.resolve());
vi.mock("./orders.js", () => ({
  getOrderForDigitalDelivery: (...args: unknown[]) => getOrderForDigitalDelivery(...args),
  claimDigitalDelivery: (...args: unknown[]) => claimDigitalDelivery(...args),
  releaseDigitalDeliveryClaim: (...args: unknown[]) => releaseDigitalDeliveryClaim(...args),
  appendOrderEvent: (...args: unknown[]) => appendOrderEvent(...args),
}));

const isResendConfigured = vi.fn();
const sendEmail = vi.fn();
vi.mock("./email.js", () => ({
  isResendConfigured: (...args: unknown[]) => isResendConfigured(...args),
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const getSql = vi.fn();
vi.mock("./db.js", () => ({ getSql: (...args: unknown[]) => getSql(...args) }));

const signAssetUrl = vi.fn();
vi.mock("./blob.js", () => ({ signAssetUrl: (...args: unknown[]) => signAssetUrl(...args) }));

const { deliverDigitalFiles } = await import("./digitalDelivery.js");

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "ord-1",
    orderNumber: "HB-ABCD1234",
    email: "buyer@example.com",
    digitalDeliveredAt: null,
    items: [
      {
        productLabel: "16 × 24 in print",
        posterConfig: { format: "print", addFrame: false },
        assetUrl: "https://blob.example.com/posters/a.png",
        svgAssetUrl: "https://blob.example.com/posters/a.svg",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSql.mockReturnValue({});
  isResendConfigured.mockReturnValue(true);
  claimDigitalDelivery.mockResolvedValue(true);
  signAssetUrl.mockImplementation(async (url: string) => `${url}?signed=1`);
  sendEmail.mockResolvedValue({ id: "resend-1" });
});

describe("deliverDigitalFiles — env guards", () => {
  it("no-ops when Resend is unconfigured", async () => {
    isResendConfigured.mockReturnValue(false);
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "unconfigured" });
    expect(getOrderForDigitalDelivery).not.toHaveBeenCalled();
  });

  it("no-ops when the DB is unconfigured, without ever touching Resend", async () => {
    getSql.mockReturnValue(null);
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "unconfigured" });
    expect(getOrderForDigitalDelivery).not.toHaveBeenCalled();
  });

  it("returns order_not_found when the DB is configured but the order row is absent", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(null);
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "order_not_found" });
  });
});

describe("deliverDigitalFiles — idempotency", () => {
  it("no-ops when digital_delivered_at is already set", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder({ digitalDeliveredAt: "2026-01-01T00:00:00.000Z" }));
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "already_delivered" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(claimDigitalDelivery).not.toHaveBeenCalled();
  });

  it("treats a lost claim race (concurrent webhook retry) as already_delivered and sends no email", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    claimDigitalDelivery.mockResolvedValue(false);
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "already_delivered" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("a second call after a successful delivery no-ops (email sent once)", async () => {
    getOrderForDigitalDelivery.mockResolvedValueOnce(baseOrder());
    const first = await deliverDigitalFiles("ord-1");
    expect(first).toEqual({ delivered: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    getOrderForDigitalDelivery.mockResolvedValueOnce(
      baseOrder({ digitalDeliveredAt: "2026-01-01T00:00:00.000Z" }),
    );
    const second = await deliverDigitalFiles("ord-1");
    expect(second).toEqual({ delivered: false, reason: "already_delivered" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe("deliverDigitalFiles — content", () => {
  it("digital-only order: email contains signed PNG + SVG links, framed as the purchase", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "Digital download",
            posterConfig: { format: "digital" },
            assetUrl: "https://blob.example.com/posters/d.png",
            svgAssetUrl: "https://blob.example.com/posters/d.svg",
          },
        ],
      }),
    );

    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: true });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.to).toBe("buyer@example.com");
    expect(arg.subject).toBe("Your Heartbound Maps files are ready");
    expect(arg.html).toContain("https://blob.example.com/posters/d.png?signed=1");
    expect(arg.html).toContain("https://blob.example.com/posters/d.svg?signed=1");
    expect(arg.html.toLowerCase()).not.toContain("free with your print");
  });

  it("print order: email frames the digital files as bundled free with the print", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html.toLowerCase()).toContain("free");
  });

  it("signs each asset URL with the default 30-day TTL (no ttlMs override)", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    await deliverDigitalFiles("ord-1");
    expect(signAssetUrl).toHaveBeenCalledWith("https://blob.example.com/posters/a.png");
    expect(signAssetUrl).toHaveBeenCalledWith("https://blob.example.com/posters/a.svg");
    // No second argument (ttlMs override) — the default (30 days) is used.
    for (const call of signAssetUrl.mock.calls) {
      expect(call).toHaveLength(1);
    }
  });

  it("missing svg_asset_url: PNG-only, no broken SVG link", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "16 × 24 in print",
            posterConfig: { format: "print" },
            assetUrl: "https://blob.example.com/posters/a.png",
            svgAssetUrl: null,
          },
        ],
      }),
    );
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html).toContain("https://blob.example.com/posters/a.png?signed=1");
    expect(arg.html).not.toContain("SVG");
    expect(signAssetUrl).toHaveBeenCalledTimes(1);
  });

  it("signs and includes bonus wallpaper URLs when present", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "16 × 24 in print",
            posterConfig: { format: "print" },
            assetUrl: "https://blob.example.com/posters/a.png",
            svgAssetUrl: "https://blob.example.com/posters/a.svg",
            phoneWallpaperAssetUrl: "https://blob.example.com/posters/a-phone.png",
            desktopWallpaperAssetUrl: "https://blob.example.com/posters/a-desktop.png",
          },
        ],
      }),
    );
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html).toContain("https://blob.example.com/posters/a-phone.png?signed=1");
    expect(arg.html).toContain("https://blob.example.com/posters/a-desktop.png?signed=1");
    expect(arg.html.toLowerCase()).toContain("your bonuses");
  });

  it("omits the bonus section when neither wallpaper asset is present (no broken links)", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html.toLowerCase()).not.toContain("wallpaper");
  });

  it("builds and includes the coordinate story when poster_config has a home and places", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "16 × 24 in print",
            posterConfig: {
              format: "print",
              home: { lat: -37.8136, lng: 144.9631, label: "Melbourne" },
              places: [{ label: "Sydney", affiliation: "born", lat: -33.8688, lng: 151.2093 }],
              units: "km",
            },
            assetUrl: "https://blob.example.com/posters/a.png",
            svgAssetUrl: null,
          },
        ],
      }),
    );
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html.toLowerCase()).toContain("the story behind your coordinates");
    expect(arg.html).toContain("Born in Sydney");
  });

  it("omits the story section when poster_config has no home (legacy order)", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder()); // baseOrder's posterConfig has no home
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html.toLowerCase()).not.toContain("story behind your coordinates");
  });

  it("includes a hanging-guide link built from the real (unmocked) URL helper", async () => {
    // No PUBLIC_APP_URL/VERCEL set in this hermetic test process, so the
    // helper falls back to the local dev origin — this still proves the link
    // flows end to end from deliverDigitalFiles into the sent email, not just
    // at the pure-template level (see emails/digitalDelivery.test.ts).
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    await deliverDigitalFiles("ord-1");
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.html).toContain("/hanging-guide");
  });

  it("marks delivered and appends an order_event on send success", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    await deliverDigitalFiles("ord-1");
    expect(claimDigitalDelivery).toHaveBeenCalledWith("ord-1");
    expect(releaseDigitalDeliveryClaim).not.toHaveBeenCalled();
    expect(appendOrderEvent).toHaveBeenCalledWith(
      "ord-1",
      expect.objectContaining({ message: expect.stringContaining("Digital files emailed"), source: "system" }),
    );
  });
});

describe("deliverDigitalFiles — missing-bonus observability", () => {
  it("records an order_event noting the missing bonus wallpapers when an item lacks both", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder()); // baseOrder's item has no wallpaper URLs
    await deliverDigitalFiles("ord-1");
    expect(appendOrderEvent).toHaveBeenCalledWith(
      "ord-1",
      expect.objectContaining({
        message: expect.stringContaining("missing promised bonus wallpaper"),
        source: "system",
      }),
    );
  });

  it("names which bonus is missing when only one of the two is absent", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "16 × 24 in print",
            posterConfig: { format: "print" },
            assetUrl: "https://blob.example.com/posters/a.png",
            svgAssetUrl: "https://blob.example.com/posters/a.svg",
            phoneWallpaperAssetUrl: "https://blob.example.com/posters/a-phone.png",
            desktopWallpaperAssetUrl: null,
          },
        ],
      }),
    );
    await deliverDigitalFiles("ord-1");
    const call = appendOrderEvent.mock.calls.find(([, event]) =>
      (event as { message: string }).message.includes("missing promised bonus wallpaper"),
    );
    expect(call?.[1].message).toContain("desktop wallpaper");
    expect(call?.[1].message).not.toContain("phone wallpaper");
  });

  it("does NOT record a missing-bonus event when both wallpapers are present", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "16 × 24 in print",
            posterConfig: { format: "print" },
            assetUrl: "https://blob.example.com/posters/a.png",
            svgAssetUrl: "https://blob.example.com/posters/a.svg",
            phoneWallpaperAssetUrl: "https://blob.example.com/posters/a-phone.png",
            desktopWallpaperAssetUrl: "https://blob.example.com/posters/a-desktop.png",
          },
        ],
      }),
    );
    await deliverDigitalFiles("ord-1");
    for (const call of appendOrderEvent.mock.calls) {
      expect((call[1] as { message: string }).message).not.toContain("missing promised bonus wallpaper");
    }
  });
});

describe("deliverDigitalFiles — no assets (pre-B2 legacy order)", () => {
  it("no email when no item has any asset; logs an order_event and returns no_assets", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(
      baseOrder({
        items: [
          {
            productLabel: "16 × 24 in print",
            posterConfig: { format: "print" },
            assetUrl: null,
            svgAssetUrl: null,
          },
        ],
      }),
    );
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "no_assets" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(claimDigitalDelivery).not.toHaveBeenCalled();
    expect(appendOrderEvent).toHaveBeenCalledWith(
      "ord-1",
      expect.objectContaining({ source: "system" }),
    );
  });
});

describe("deliverDigitalFiles — send failure", () => {
  it("does not mark delivered (releases the claim), logs an order_event, and returns email_send_failed", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    sendEmail.mockResolvedValue(null);
    const result = await deliverDigitalFiles("ord-1");
    expect(result).toEqual({ delivered: false, reason: "email_send_failed" });
    expect(claimDigitalDelivery).toHaveBeenCalledWith("ord-1");
    expect(releaseDigitalDeliveryClaim).toHaveBeenCalledWith("ord-1");
    expect(appendOrderEvent).toHaveBeenCalledWith(
      "ord-1",
      expect.objectContaining({
        message: expect.stringContaining("Digital delivery failed: email send failed"),
        source: "system",
      }),
    );
  });
});

describe("deliverDigitalFiles — never throws", () => {
  it("swallows an order-load exception", async () => {
    getOrderForDigitalDelivery.mockRejectedValue(new Error("db exploded"));
    await expect(deliverDigitalFiles("ord-1")).resolves.toEqual({ delivered: false, reason: "load_failed" });
  });

  it("swallows a claim exception", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    claimDigitalDelivery.mockRejectedValue(new Error("db exploded"));
    await expect(deliverDigitalFiles("ord-1")).resolves.toEqual({ delivered: false, reason: "claim_failed" });
  });

  it("swallows a sendEmail exception", async () => {
    getOrderForDigitalDelivery.mockResolvedValue(baseOrder());
    sendEmail.mockRejectedValue(new Error("resend down"));
    await expect(deliverDigitalFiles("ord-1")).resolves.toEqual({ delivered: false, reason: "email_send_failed" });
    expect(releaseDigitalDeliveryClaim).toHaveBeenCalledWith("ord-1");
  });
});
