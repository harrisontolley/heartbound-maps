import { beforeEach, describe, expect, it } from "vitest";
import type { StudioSelection } from "@/lib/commerce/price";
import type { PosterConfigSnapshot } from "@/lib/commerce/posterConfig";
import { cartCount, cartSubtotalCents, useCartStore } from "./cartStore";

function sel(totalCents: number, productId = "portrait-16x24"): StudioSelection {
  return {
    format: "print",
    productId,
    size: { label: "16 × 24 in", widthIn: 16, heightIn: 24 },
    addFrame: false,
    totalCents,
    lineItems: [],
  };
}
const cfg = {} as PosterConfigSnapshot;

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe("cartStore", () => {
  it("adds an item with a generated id and default quantity 1", () => {
    useCartStore.getState().addItem({ selection: sel(5900), posterConfig: cfg });
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBeTruthy();
    expect(items[0].quantity).toBe(1);
  });

  it("carries assetUrl and svgAssetUrl through onto the item", () => {
    useCartStore.getState().addItem({
      selection: sel(5900),
      posterConfig: cfg,
      assetUrl: "https://blob.example/posters/london-1.png",
      svgAssetUrl: "https://blob.example/posters/london-1.svg",
    });
    const { items } = useCartStore.getState();
    expect(items[0].assetUrl).toBe("https://blob.example/posters/london-1.png");
    expect(items[0].svgAssetUrl).toBe("https://blob.example/posters/london-1.svg");
  });

  it("leaves assetUrl and svgAssetUrl undefined when omitted", () => {
    useCartStore.getState().addItem({ selection: sel(5900), posterConfig: cfg });
    const { items } = useCartStore.getState();
    expect(items[0].assetUrl).toBeUndefined();
    expect(items[0].svgAssetUrl).toBeUndefined();
  });

  it("clamps quantity to [1, 25]", () => {
    useCartStore.getState().addItem({ selection: sel(5900), posterConfig: cfg });
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setQuantity(id, 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
    useCartStore.getState().setQuantity(id, 999);
    expect(useCartStore.getState().items[0].quantity).toBe(25);
  });

  it("removes a single item and clears the cart", () => {
    useCartStore.getState().addItem({ selection: sel(5900), posterConfig: cfg });
    useCartStore.getState().addItem({ selection: sel(3900), posterConfig: cfg });
    const firstId = useCartStore.getState().items[0].id;
    useCartStore.getState().removeItem(firstId);
    expect(useCartStore.getState().items).toHaveLength(1);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("computes count and subtotal across quantities", () => {
    useCartStore.getState().addItem({ selection: sel(5900), posterConfig: cfg, quantity: 2 });
    useCartStore.getState().addItem({ selection: sel(3900), posterConfig: cfg, quantity: 1 });
    const { items } = useCartStore.getState();
    expect(cartCount(items)).toBe(3);
    expect(cartSubtotalCents(items)).toBe(5900 * 2 + 3900);
  });
});
