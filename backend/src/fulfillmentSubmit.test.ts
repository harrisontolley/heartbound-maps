import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FulfillmentOrder } from "./orders.js";

// submitOrderToArtelo orchestration: exact-DPI render selection + the DPI floor
// guard. All collaborators are module-mocked so nothing rasterizes or hits the
// network; we assert the chosen asset (server render preferred over client PNG)
// and that a sub-150-DPI asset blocks submission with a logged failure.

const getArteloConfig = vi.fn();
const arteloFetch = vi.fn();
vi.mock("./artelo.js", () => ({
  getArteloConfig: () => getArteloConfig(),
  arteloFetch: (...a: unknown[]) => arteloFetch(...a),
}));

const getOrderForFulfillment = vi.fn();
const recordFulfillmentAttempt = vi.fn(async () => {});
const appendOrderEvent = vi.fn(async () => {});
const setArteloOrderId = vi.fn(async () => {});
const setArteloStatus = vi.fn(async () => {});
vi.mock("./orders.js", () => ({
  getOrderForFulfillment: (...a: unknown[]) => getOrderForFulfillment(...a),
  recordFulfillmentAttempt: (...a: unknown[]) => recordFulfillmentAttempt(...a),
  appendOrderEvent: (...a: unknown[]) => appendOrderEvent(...a),
  setArteloOrderId: (...a: unknown[]) => setArteloOrderId(...a),
  setArteloStatus: (...a: unknown[]) => setArteloStatus(...a),
}));

const signAssetUrl = vi.fn(async (u: string) => `${u}?sig`);
vi.mock("./blob.js", () => ({ signAssetUrl: (...a: unknown[]) => signAssetUrl(...(a as [string])) }));

const ensurePrintAsset = vi.fn();
const physicalInches = vi.fn();
vi.mock("./renderPrint.js", () => ({
  ensurePrintAsset: (...a: unknown[]) => ensurePrintAsset(...a),
  physicalInches: (...a: unknown[]) => physicalInches(...a),
}));

const fetchPngDimensions = vi.fn();
vi.mock("./pngMeta.js", () => ({ fetchPngDimensions: (...a: unknown[]) => fetchPngDimensions(...a) }));

const { submitOrderToArtelo } = await import("./fulfillment.js");

function order(): FulfillmentOrder {
  return {
    id: "ord-uuid",
    orderNumber: "PP-1",
    email: "buyer@example.com",
    currency: "usd",
    totalCents: 9100,
    arteloOrderId: null,
    shipping: { name: "Ada", line1: "1 Way", city: "London", country: "GB" },
    items: [
      {
        id: "item-1",
        productId: "portrait-16x24",
        productLabel: "16 × 24 in print",
        quantity: 1,
        unitPriceCents: 9100,
        assetUrl: "https://blob/posters/client.png",
        svgAssetUrl: "https://blob/posters/design.svg",
        renderAssetUrl: null,
        posterConfig: { format: "print", addFrame: false },
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getArteloConfig.mockReturnValue({ testOrders: false });
  getOrderForFulfillment.mockResolvedValue(order());
  physicalInches.mockReturnValue({ widthIn: 16, heightIn: 24 });
});

describe("submitOrderToArtelo — DPI floor guard", () => {
  it("blocks submission and logs a failed row when the asset is below 150 DPI", async () => {
    ensurePrintAsset.mockResolvedValue({ url: "https://blob/posters/client.png", source: "client" });
    fetchPngDimensions.mockResolvedValue({ w: 2000, h: 3000 }); // 2000/16 = 125 DPI

    const res = await submitOrderToArtelo("ord-uuid");

    expect(res).toEqual({ submitted: false, reason: "dpi_below_minimum" });
    expect(arteloFetch).not.toHaveBeenCalled();
    expect(recordFulfillmentAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", error: "dpi_below_minimum:2000x3000" }),
    );
    expect(appendOrderEvent).toHaveBeenCalled();
  });
});

describe("submitOrderToArtelo — server render preferred", () => {
  it("submits the server-rendered asset (not the client PNG) when it passes the DPI floor", async () => {
    ensurePrintAsset.mockResolvedValue({
      url: "https://blob/posters/print-PP-1-0.png",
      source: "server",
    });
    fetchPngDimensions.mockResolvedValue({ w: 4800, h: 7200 }); // 300 DPI
    arteloFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: "artelo-1", status: "Received" }),
    });

    const res = await submitOrderToArtelo("ord-uuid");

    expect(res).toEqual({ submitted: true });
    expect(arteloFetch).toHaveBeenCalledWith("/orders/create", expect.any(Object));
    const body = JSON.parse((arteloFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.items[0].productInfo.designs[0].sourceImage.url).toBe(
      "https://blob/posters/print-PP-1-0.png?sig",
    );
    expect(setArteloOrderId).toHaveBeenCalledWith("ord-uuid", "artelo-1");
  });
});
