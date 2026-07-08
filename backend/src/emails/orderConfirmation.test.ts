import { describe, expect, it } from "vitest";
import { GUARANTEE_NAME } from "@heartbound/shared";
import { orderConfirmationEmail } from "./orderConfirmation.js";

// Pure template — no I/O. Covers: item lines (qty/unit price/line total), the
// subtotal/shipping/total summary, the shipping address block (present only
// for physical orders), the guarantee name, the delivery-window line, the
// always-on "digital files arrive separately" note, the /track link (and its
// graceful omission when unconfigured), and escaping of order-derived data.

const oneItem = [{ label: "16 x 24 in Vintage Cartography, Melbourne", quantity: 1, unitPriceCents: 9500 }];

const shippingAddress = {
  name: "Ada Lovelace",
  line1: "1 Analytical Way",
  line2: "Floor 2",
  city: "London",
  region: "Greater London",
  postal: "SW1A 1AA",
  country: "GB",
};

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    orderNumber: "HB-ABCD1234",
    items: oneItem,
    subtotalCents: 9500,
    shippingCents: 0,
    totalCents: 9500,
    currency: "usd",
    shippingAddress,
    trackUrl: "https://heartboundmaps.example.com/track",
    ...overrides,
  };
}

describe("orderConfirmationEmail", () => {
  it("returns a non-empty subject, html, and text", () => {
    const { subject, html, text } = orderConfirmationEmail(baseInput());
    expect(subject).toBeTruthy();
    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
  });

  it("includes the order number in the subject", () => {
    const { subject } = orderConfirmationEmail(baseInput());
    expect(subject).toContain("HB-ABCD1234");
  });

  it("renders each item's label, quantity, unit price, and line total", () => {
    const { html, text } = orderConfirmationEmail(
      baseInput({
        items: [
          { label: "Item One", quantity: 2, unitPriceCents: 5000 },
          { label: "Item Two", quantity: 1, unitPriceCents: 3000 },
        ],
        subtotalCents: 13000,
        totalCents: 13000,
      }),
    );
    for (const content of [html, text]) {
      expect(content).toContain("Item One");
      expect(content).toContain("Item Two");
      expect(content).toContain("2");
      expect(content).toContain("$50.00");
      expect(content).toContain("$100.00"); // line total for Item One (2 x $50)
      expect(content).toContain("$30.00");
    }
  });

  it("renders the subtotal, shipping, and total", () => {
    const { html, text } = orderConfirmationEmail(
      baseInput({ subtotalCents: 9500, shippingCents: 500, totalCents: 10000 }),
    );
    for (const content of [html, text]) {
      expect(content).toContain("$95.00");
      expect(content).toContain("$5.00");
      expect(content).toContain("$100.00");
    }
  });

  it('shows "Free" for shipping when shippingCents is 0', () => {
    const { html, text } = orderConfirmationEmail(baseInput({ shippingCents: 0 }));
    for (const content of [html, text]) {
      expect(content.toLowerCase()).toContain("free");
    }
  });

  it("renders the shipping address when present", () => {
    const { html, text } = orderConfirmationEmail(baseInput());
    for (const content of [html, text]) {
      expect(content).toContain("Ada Lovelace");
      expect(content).toContain("1 Analytical Way");
      expect(content).toContain("London");
      expect(content).toContain("SW1A 1AA");
    }
  });

  it("mentions the delivery window (5 to 10 business days) when there is a shipping address", () => {
    const { html, text } = orderConfirmationEmail(baseInput());
    for (const content of [html, text]) {
      expect(content).toMatch(/5 to 10 business days/);
    }
  });

  it("omits the shipping address and delivery-window line for a digital-only order (no shipping address)", () => {
    const { html, text } = orderConfirmationEmail(
      baseInput({ shippingAddress: undefined, shippingCents: 0 }),
    );
    for (const content of [html, text]) {
      expect(content).not.toContain("Ada Lovelace");
      expect(content).not.toMatch(/5 to 10 business days/);
    }
  });

  it("always notes that digital files arrive in a separate email", () => {
    const withShipping = orderConfirmationEmail(baseInput());
    const withoutShipping = orderConfirmationEmail(baseInput({ shippingAddress: undefined }));
    for (const { html, text } of [withShipping, withoutShipping]) {
      for (const content of [html, text]) {
        expect(content.toLowerCase()).toContain("digital");
        expect(content.toLowerCase()).toContain("separate email");
      }
    }
  });

  it("names the guarantee", () => {
    const { html, text } = orderConfirmationEmail(baseInput());
    expect(html).toContain(GUARANTEE_NAME);
    expect(text).toContain(GUARANTEE_NAME);
  });

  it("includes the /track link when trackUrl is provided", () => {
    const { html, text } = orderConfirmationEmail(baseInput({ trackUrl: "https://heartboundmaps.example.com/track" }));
    expect(html).toContain("https://heartboundmaps.example.com/track");
    expect(text).toContain("https://heartboundmaps.example.com/track");
  });

  it("gracefully omits the track link when trackUrl is null (no broken link)", () => {
    const { html } = orderConfirmationEmail(baseInput({ trackUrl: null }));
    expect(html).not.toContain("href=\"\"");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  it("HTML-escapes an item label containing markup", () => {
    const { html } = orderConfirmationEmail(
      baseInput({ items: [{ label: `Mom & Dad's <script>alert(1)</script> "Trip"`, quantity: 1, unitPriceCents: 100 }] }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("Mom &amp; Dad&#39;s &lt;script&gt;alert(1)&lt;/script&gt; &quot;Trip&quot;");
  });

  it("HTML-escapes shipping address fields", () => {
    const { html } = orderConfirmationEmail(
      baseInput({ shippingAddress: { ...shippingAddress, name: `<b>Evil</b>` } }),
    );
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
  });

  it("copy contains no em/en dashes, no exclamation marks, and never the word poster", () => {
    const { subject, html, text } = orderConfirmationEmail(baseInput());
    // Strip the literal "<!doctype html>" markup boilerplate before checking
    // for "!" — the rule is about authored copy, not HTML syntax.
    for (const content of [subject, html.replace("<!doctype html>", ""), text]) {
      expect(content).not.toMatch(/[—–]/);
      expect(content).not.toMatch(/!/);
      expect(content.toLowerCase()).not.toContain("poster");
    }
  });
});
